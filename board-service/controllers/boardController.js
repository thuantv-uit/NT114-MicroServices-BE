const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Board = require('../models/boardModel');
const { checkUserExists } = require('../services/user');
const { checkBoardInvitation } = require('../services/invitation');
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

// ✅ Phân quyền rõ ràng:
// - owner: full quyền (admin)
// - admin: full quyền
// - member: xem + thêm/sửa object bên trong board
// - viewer: không có quyền gì (bị chặn hoàn toàn)
const validateUserAndBoardAccess = async (boardId, userId, token, requiredRole = ['admin']) => {
  const user = await checkUserExists(userId, token);
  if (!user) {
    throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  const board = await Board.findById(boardId);
  if (!board) {
    throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  // Owner luôn có quyền admin
  if (board.userId.toString() === userId) {
    return { user, board, role: 'admin' };
  }

  // Kiểm tra có trong memberIds không
  const member = board.memberIds.find(m => m.userId.toString() === userId);
  if (!member) {
    throwError(ERROR_MESSAGES.NOT_INVITED_TO_BOARD, STATUS_CODES.FORBIDDEN);
  }

  // Viewer không có quyền gì hết
  // if (member.role === 'viewer') {
  //   throwError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS, STATUS_CODES.FORBIDDEN);
  // }

  // Kiểm tra role có đủ quyền không
  if (!requiredRole.includes(member.role)) {
    throwError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS, STATUS_CODES.FORBIDDEN);
  }

  return { user, board, role: member.role };
};

const createBoard = async (req, res, next) => {
  try {
    const { title, description, backgroundColor, backgroundImage } = req.body;
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = new Board({
      title,
      description,
      backgroundColor,
      backgroundImage,
      userId: req.user.id,
      memberIds: [],
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
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    // Lấy boards mà user là owner
    const ownedBoards = await Board.find({ userId: req.user.id });

    // Lấy boards mà user có trong memberIds (bất kể role)
    const memberBoards = await Board.find({ 'memberIds.userId': req.user.id });

    // Gộp, loại bỏ trùng lặp
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

// ✅ Chỉ owner, admin, member được xem — viewer bị chặn
const getBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin', 'member', 'viewer']);
    res.json(board);
  } catch (error) {
    next(error);
  }
};

// ✅ Internal endpoint — mọi authenticated user đều gọi được (dùng cho các service khác)
const allUserGetBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = await Board.findById(id);
    if (!board) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(board);
  } catch (error) {
    next(error);
  }
};

// ✅ Chỉ admin được update board (title, description, background...)
const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, backgroundColor, columnOrderIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin']);
    board.title = title !== undefined ? title : board.title;
    board.description = description !== undefined ? description : board.description;
    if (backgroundColor !== undefined) {
      board.backgroundColor = backgroundColor;
      board.backgroundColorUpdatedAt = Date.now();
    }
    if (req.file) {
      const result = await streamUpload(req.file.buffer, 'board_images');
      board.backgroundImage = result.secure_url;
      board.backgroundImageUpdatedAt = Date.now();
    }
    board.columnOrderIds = columnOrderIds !== undefined ? columnOrderIds : board.columnOrderIds;
    board.updatedAt = Date.now();
    await board.save();
    res.json(board);
  } catch (error) {
    next(error);
  }
};

// ✅ Chỉ admin được xóa board
const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token, ['admin']);
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
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const latestBoard = await Board.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('_id');
    if (!latestBoard) {
      throwError(ERROR_MESSAGES.NO_BOARDS_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json({ boardId: latestBoard._id });
  } catch (error) {
    next(error);
  }
};

// ✅ Internal endpoint cho Invitation Service — chỉ verify token, không check quyền board
const updateBoardMemberIds = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = await Board.findById(id);
    if (!board) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    const newMemberIds = Array.isArray(memberIds) ? memberIds : [memberIds];
    const merged = [...board.memberIds];
    for (const newMember of newMemberIds) {
      const exists = merged.some(
        m => m.userId.toString() === newMember.userId.toString()
      );
      if (!exists) {
        merged.push(newMember);
      }
    }
    board.memberIds = merged;
    board.updatedAt = Date.now();
    await board.save();
    res.json(board);
  } catch (error) {
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
};