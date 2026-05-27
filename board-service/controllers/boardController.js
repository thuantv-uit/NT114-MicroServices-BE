const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Board = require('../models/boardModel');
const { checkUserExists } = require('../services/user');
const { getColumnByIdForAll, createColumn, updateColumnCardOrder } = require('../services/column');
const { getCardById, createCard } = require('../services/card');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { streamUpload } = require('../config/CloudinaryProvider');

const authMiddleware = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throwError(ERROR_MESSAGES.NO_TOKEN, STATUS_CODES.UNAUTHORIZED);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    throwError(ERROR_MESSAGES.INVALID_TOKEN, STATUS_CODES.UNAUTHORIZED);
  }
};

const validateUserAndBoardAccess = async (boardId, userId, token, requiredRole = ['admin']) => {
  const user = await checkUserExists(userId, token);
  if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

  const board = await Board.findById(boardId);
  if (!board) throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

  if (board.userId.toString() === userId) {
    return { user, board, role: 'admin' };
  }

  const member = board.memberIds.find(m => m.userId.toString() === userId);
  if (!member) throwError(ERROR_MESSAGES.NOT_INVITED_TO_BOARD, STATUS_CODES.FORBIDDEN);

  if (!requiredRole.includes(member.role)) {
    throwError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS, STATUS_CODES.FORBIDDEN);
  }

  return { user, board, role: member.role };
};

// ─── Template Clone Helper ────────────────────────────────────────────────────

/**
 * Clone toàn bộ columns + cards từ template board sang board mới.
 * Gọi qua HTTP đến Column Service và Card Service.
 */
const cloneColumnsFromTemplate = async (templateColumnOrderIds, newBoardId, newOwnerId, token) => {
  const newColumnIds = [];

  for (const templateColId of templateColumnOrderIds) {
    // 1. Lấy template column — dùng /all/:id không check quyền
    let templateCol;
    try {
      templateCol = await getColumnByIdForAll(templateColId.toString(), token);
    } catch (err) {
      console.error(`❌ Failed to fetch template column ${templateColId}:`, err.message);
      continue;
    }
    if (!templateCol) continue;

    // 2. Tạo column mới bên Column Service
    let newColumn;
    try {
      newColumn = await createColumn({
        title:           templateCol.title,
        boardId:         newBoardId.toString(),
      }, token);
    } catch (err) {
      console.error(`❌ Failed to create column "${templateCol.title}":`, err.message);
      continue;
    }
    if (!newColumn) continue;

    const newCardIds = [];

    // 3. Clone từng card theo đúng thứ tự cardOrderIds
    for (const templateCardId of (templateCol.cardOrderIds || [])) {
      let templateCard;
      try {
        templateCard = await getCardById(templateCardId.toString(), token);
      } catch (err) {
        console.error(`❌ Failed to fetch template card ${templateCardId}:`, err.message);
        continue;
      }
      if (!templateCard) continue;

      let newCard;
      try {
        newCard = await createCard({
          title:       templateCard.title,
          description: templateCard.description || '',
          columnId:    newColumn._id.toString(),
        }, token);
      } catch (err) {
        console.error(`❌ Failed to create card "${templateCard.title}":`, err.message);
        continue;
      }
      if (!newCard) continue;

      newCardIds.push(newCard._id);
    }

    // 4. Cập nhật cardOrderIds cho column mới
    if (newCardIds.length > 0) {
      try {
        await updateColumnCardOrder(
          newColumn._id.toString(),
          newCardIds.map(id => id.toString()),
          token
        );
      } catch (err) {
        console.error(`❌ Failed to update cardOrderIds for column ${newColumn._id}:`, err.message);
      }
    }

    newColumnIds.push(newColumn._id);
    console.log(`✅ Cloned column "${templateCol.title}" with ${newCardIds.length} cards`);
  }

  return newColumnIds;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

const createBoard = async (req, res, next) => {
  try {
    const { title, description, backgroundColor, backgroundImage } = req.body;
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const board = new Board({
      title,
      description,
      backgroundColor,
      backgroundImage,
      userId: req.user.id,
      memberIds: [],
      type: 'private',
    });
    await board.save();
    res.status(STATUS_CODES.CREATED).json(board);
  } catch (error) {
    next(error);
  }
};

const getBoards = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const ownedBoards  = await Board.find({ userId: req.user.id, type: { $ne: 'template' } });
    const memberBoards = await Board.find({ 'memberIds.userId': req.user.id, type: { $ne: 'template' } });

    const boards = [...ownedBoards];
    memberBoards.forEach(board => {
      if (!boards.some(owned => owned._id.toString() === board._id.toString())) {
        boards.push(board);
      }
    });

    res.json(boards);
  } catch (error) {
    next(error);
  }
};

const getBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin', 'member', 'viewer']);
    res.json(board);
  } catch (error) {
    next(error);
  }
};

const allUserGetBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const board = await Board.findById(id);
    if (!board) throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    res.json(board);
  } catch (error) {
    next(error);
  }
};

const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, backgroundColor, columnOrderIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin']);

    if (board.type === 'template') {
      throwError('Cannot update a template board', STATUS_CODES.FORBIDDEN);
    }

    board.title           = title           !== undefined ? title           : board.title;
    board.description     = description     !== undefined ? description     : board.description;
    if (backgroundColor !== undefined) {
      board.backgroundColor          = backgroundColor;
      board.backgroundColorUpdatedAt = Date.now();
    }
    if (req.file) {
      const result = await streamUpload(req.file.buffer, 'board_images');
      board.backgroundImage          = result.secure_url;
      board.backgroundImageUpdatedAt = Date.now();
    }
    board.columnOrderIds = columnOrderIds !== undefined ? columnOrderIds : board.columnOrderIds;
    board.updatedAt      = Date.now();
    await board.save();
    res.json(board);
  } catch (error) {
    next(error);
  }
};

const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin']);

    if (board.type === 'template') {
      throwError('Cannot delete a template board', STATUS_CODES.FORBIDDEN);
    }

    await board.deleteOne();
    res.json({ message: ERROR_MESSAGES.BOARD_DELETED });
  } catch (error) {
    next(error);
  }
};

const getLatestBoardId = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const latestBoard = await Board.findOne({ userId: req.user.id, type: { $ne: 'template' } })
      .sort({ createdAt: -1 })
      .select('_id');
    if (!latestBoard) throwError(ERROR_MESSAGES.NO_BOARDS_FOUND, STATUS_CODES.NOT_FOUND);

    res.json({ boardId: latestBoard._id });
  } catch (error) {
    next(error);
  }
};

const updateBoardMemberIds = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const board = await Board.findById(id);
    if (!board) throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const newMemberIds = Array.isArray(memberIds) ? memberIds : [memberIds];
    const merged = [...board.memberIds];
    for (const newMember of newMemberIds) {
      const exists = merged.some(m => m.userId.toString() === newMember.userId.toString());
      if (!exists) merged.push(newMember);
    }
    board.memberIds = merged;
    board.updatedAt = Date.now();
    await board.save();
    res.json(board);
  } catch (error) {
    next(error);
  }
};

// ─── Template Controllers ─────────────────────────────────────────────────────

const getTemplateBoards = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const templates = await Board.find({ type: 'template' })
      .select('title description backgroundColor backgroundImage columnOrderIds createdAt');

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

const getTemplateBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const template = await Board.findOne({ _id: id, type: 'template' });
    if (!template) throwError('Template not found', STATUS_CODES.NOT_FOUND);

    res.json(template);
  } catch (error) {
    next(error);
  }
};

const createBoardFromTemplate = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const { title } = req.body;
    const token     = extractToken(req);

    console.log('🔍 Step 1: start clone, templateId:', id);

    if (!isValidObjectId(id)) throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);

    console.log('🔍 Step 2: check user');
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    console.log('🔍 Step 3: find template');
    const template = await Board.findOne({ _id: id, type: 'template' });
    if (!template) throwError('Template not found', STATUS_CODES.NOT_FOUND);
    console.log('🔍 template found:', template.title, '| columns:', template.columnOrderIds?.length);

    console.log('🔍 Step 4: create new board');
    const newBoard = new Board({
      title:           title?.trim() || `Copy of ${template.title}`,
      description:     template.description,
      backgroundColor: template.backgroundColor,
      backgroundImage: template.backgroundImage,
      userId:          req.user.id,
      memberIds:       [],
      columnOrderIds:  [],
      type:            'private',
    });
    await newBoard.save();
    console.log('🔍 new board created:', newBoard._id);

    console.log('🔍 Step 5: clone columns + cards');
    const clonedColumnIds = await cloneColumnsFromTemplate(
      template.columnOrderIds,
      newBoard._id,
      req.user.id,
      token
    );
    console.log('🔍 cloned columns:', clonedColumnIds.length);

    // Dùng findByIdAndUpdate để tránh VersionError do column-service đã update board
    const updatedBoard = await Board.findByIdAndUpdate(
      newBoard._id,
      { columnOrderIds: clonedColumnIds },
      { new: true }
    );

    res.status(STATUS_CODES.CREATED).json(updatedBoard);
  } catch (error) {
    console.error('❌ createBoardFromTemplate error:', error);
    next(error);
  }
};

module.exports = {
  authMiddleware,
  createBoard,
  getBoards,
  getBoardById,
  allUserGetBoard,
  updateBoard,
  deleteBoard,
  getLatestBoardId,
  updateBoardMemberIds,
  getTemplateBoards,
  getTemplateBoardById,
  createBoardFromTemplate,
};