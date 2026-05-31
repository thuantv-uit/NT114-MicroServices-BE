const jwt = require('jsonwebtoken');
const Card = require('../models/cardModel');
const { getColumnById, getColumnByIdForAll, updateColumnCardOrder, getColumnsByBoard } = require('../services/column');
const { getBoardById, getAllBoardById } = require('../services/board');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { validateUserAndBoardAccess } = require('../utils/permissions');
const { streamUpload } = require('../config/CloudinaryProvider');

// ─── Auth Middleware ──────────────────────────────────────────────────────────

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

// ─── Role Helpers ─────────────────────────────────────────────────────────────

const getUserColumnRole = (column, board, userId) => {
  if (board.userId.toString() === userId) return 'owner';
  const member = (column.memberIds || []).find(m => m.userId.toString() === userId);
  return member ? member.role : null;
};

const ROLE_HIERARCHY = { owner: 4, admin: 3, member: 2, viewer: 1 };

const hasMinRole = (role, minRole) => {
  if (!role) return false;
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
};

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Lấy column + board + role — dùng cho các luồng cần check quyền (board thường)
 */
const getColumnAndRole = async (columnId, userId, token) => {
  const column = await getColumnByIdForAll(columnId, token);
  const board = await getBoardById(column.boardId, userId, token);
  const role = getUserColumnRole(column, board, userId);
  return { column, board, role };
};

/**
 * Lấy column + board.type — dùng để check template, không cần check quyền membership
 * Tránh bị 403 khi user không thuộc board nhưng cần xem template
 */
const getColumnAndBoardType = async (columnId, token) => {
  const column = await getColumnByIdForAll(columnId, token);
  // ✅ Dùng getAllBoardById — endpoint /boards/all/:id không check membership
  const board = await getAllBoardById(column.boardId, token);
  return { column, board };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /
 * Tạo card mới — member trở lên
 * ✅ Không cho phép tạo card trong template board
 */
const createCard = async (req, res, next) => {
  try {
    const { title, description, columnId, process, deadline } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { column, board, role } = await getColumnAndRole(columnId, req.user.id, token);

    if (board.type === 'template') {
      throwError('Cannot create cards in a template board', STATUS_CODES.FORBIDDEN);
    }

    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    if (process !== undefined && (typeof process !== 'number' || process < 0 || process > 100)) {
      throwError('Giá trị process phải là số từ 0 đến 100', STATUS_CODES.BAD_REQUEST);
    }

    const card = new Card({
      title,
      description,
      columnId,
      process: process !== undefined ? process : 0,
      deadline,
      userId: req.user.id,
    });
    await card.save();

    const newCardOrderIds = [...(column.cardOrderIds || []), card._id.toString()];
    await updateColumnCardOrder(columnId, newCardOrderIds, token);

    res.status(STATUS_CODES.CREATED).json(card);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /column/:columnId
 * Xem danh sách card trong column — viewer trở lên
 * ✅ Template column: ai cũng xem được
 */
const getCardsByColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    // ✅ Check board.type trước — không cần quyền membership
    const { board } = await getColumnAndBoardType(columnId, token);

    if (board?.type === 'template') {
      const allCards = await Card.find({ columnId });
      return res.json(allCards);
    }

    // Board thường — check role
    const { role } = await getColumnAndRole(columnId, req.user.id, token);
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    const allCards = await Card.find({ columnId });
    res.json(allCards);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:id
 * Xem chi tiết card — viewer trở lên
 * ✅ Template card: ai cũng xem được
 */
const getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    // ✅ Check board.type trước — không cần quyền membership
    const { board } = await getColumnAndBoardType(card.columnId, token);

    if (board?.type === 'template') {
      return res.json(card);
    }

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    res.json(card);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /:id
 * Cập nhật card — member trở lên
 * ✅ Template card: không cho phép sửa
 */
const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, process, deadline } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await getColumnAndBoardType(card.columnId, token);
    if (board?.type === 'template') {
      throwError('Cannot edit cards in a template board', STATUS_CODES.FORBIDDEN);
    }

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    if (process !== undefined && (typeof process !== 'number' || process < 0 || process > 100)) {
      throwError('Giá trị process phải là số từ 0 đến 100', STATUS_CODES.BAD_REQUEST);
    }

    card.title = title !== undefined ? title : card.title;
    card.description = description !== undefined ? description : card.description;
    card.process = process !== undefined ? process : card.process;
    card.deadline = deadline !== undefined ? deadline : card.deadline;
    card.updatedAt = Date.now();
    await card.save();

    res.json(card);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /:id
 * Xóa card — member trở lên
 * ✅ Template card: không cho phép xóa
 */
const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await getColumnAndBoardType(card.columnId, token);
    if (board?.type === 'template') {
      throwError('Cannot delete cards in a template board', STATUS_CODES.FORBIDDEN);
    }

    const { column, role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    await card.deleteOne();

    const newCardOrderIds = column.cardOrderIds.filter(cardId => cardId.toString() !== id);
    await updateColumnCardOrder(column._id, newCardOrderIds, token);

    res.json({ message: ERROR_MESSAGES.CARD_DELETED });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /:id/image
 * Cập nhật ảnh card — member trở lên
 * ✅ Template card: không cho phép upload
 */
const updateCardImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    if (!req.file) {
      throwError('No file uploaded', STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await getColumnAndBoardType(card.columnId, token);
    if (board?.type === 'template') {
      throwError('Cannot upload image in a template board', STATUS_CODES.FORBIDDEN);
    }

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    const result = await streamUpload(req.file.buffer, 'card_images');
    card.image = result.secure_url;
    card.updatedAt = Date.now();
    await card.save();

    res.status(STATUS_CODES.OK).json({
      card: {
        id: card._id,
        title: card.title,
        description: card.description,
        columnId: card.columnId,
        process: card.process,
        image: card.image,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /board/:boardId
 * Lấy tất cả card theo board
 * ✅ Template board: trả về tất cả cards không cần check quyền
 */
const getCardsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    // ✅ Dùng getAllBoardById — không check membership, chỉ cần biết board.type
    const board = await getAllBoardById(boardId, token);
    if (!board) throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (board.type === 'template') {
      const cards = await Card.find({ columnId: { $in: board.columnOrderIds } }).select('title deadline process');
      return res.json(cards);
    }

    // Board thường — check quyền như cũ
    await validateUserAndBoardAccess(boardId, req.user.id, token);
    const columns = await getColumnsByBoard(boardId, token);
    const columnIds = columns.map(col => col._id);
    const cards = await Card.find({ columnId: { $in: columnIds } }).select('title deadline process');
    res.json(cards);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /:id/comments
 * Thêm comment — viewer trở lên
 * ✅ Template card: không cho phép comment
 */
const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await getColumnAndBoardType(card.columnId, token);
    if (board?.type === 'template') {
      throwError('Cannot comment on a template card', STATUS_CODES.FORBIDDEN);
    }

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    card.comments.push({ text });
    await card.save();

    res.status(STATUS_CODES.CREATED).json(card.comments[card.comments.length - 1]);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:id/comments
 * Xem comment — viewer trở lên
 * ✅ Template card: ai cũng xem được
 */
const getCommentsByCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const card = await Card.findById(id);
    if (!card) throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await getColumnAndBoardType(card.columnId, token);
    if (board?.type === 'template') {
      return res.json(card.comments);
    }

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    res.json(card.comments);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCard,
  getCardsByColumn,
  getCardById,
  updateCard,
  deleteCard,
  authMiddleware,
  updateCardImage,
  getCardsByBoard,
  addComment,
  getCommentsByCard,
};