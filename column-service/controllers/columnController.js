const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Column = require('../models/columnModel');
const { checkUserExists } = require('../services/user');
const { updateBoardColumnOrder } = require('../services/board');
const { checkColumnInvitation } = require('../services/invitation');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { validateUserAndBoardAccess } = require('../utils/permissions');

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

const validateUserAndBoard = async (boardId, userId, token) => {
  const user = await checkUserExists(userId, token);
  if (!user) {
    throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  const board = await checkBoardAccess(boardId, userId, token);
  if (!board) {
    throwError(ERROR_MESSAGES.UNAUTHORIZED_OR_BOARD_NOT_FOUND, STATUS_CODES.FORBIDDEN);
  }
  return { user, board };
};

const createColumn = async (req, res, next) => {
  try {
    const { title, boardId } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    // Tạo column mới
    const column = new Column({ title, boardId });
    await column.save();

    // Cập nhật columnOrderIds trong board bằng cách gọi API của Board Service
    const newColumnOrderIds = [...(board.columnOrderIds || []), column._id.toString()];
    await updateBoardColumnOrder(boardId, newColumnOrderIds, token);

    res.status(STATUS_CODES.CREATED).json(column);
  } catch (error) {
    next(error);
  }
};

const getColumnsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    await validateUserAndBoardAccess(boardId, req.user.id, token);
    const columns = await Column.find({ boardId });
    res.json(columns);
  } catch (error) {
    next(error);
  }
};


const getColumnById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await Column.findById(id);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoard(column.boardId, req.user.id, token);
    // Cho phép board owner truy cập mà không cần lời mời column
    if (board.userId.toString() !== req.user.id) {
      const invitation = await checkColumnInvitation(column.boardId, id, req.user.id, token);
      if (!invitation) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
      }
    }
    res.json(column);
  } catch (error) {
    next(error);
  }
};

const deleteColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    await column.deleteOne();

    // Cập nhật columnOrderIds trong board
    const newColumnOrderIds = board.columnOrderIds.filter(id => id.toString() !== columnId);
    await updateBoardColumnOrder(column.boardId, newColumnOrderIds, token);

    res.json({ message: ERROR_MESSAGES.COLUMN_DELETED });
  } catch (error) {
    next(error);
  }
};

const updateColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { title, cardOrderIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    column.title = title !== undefined ? title : column.title;
    column.cardOrderIds = cardOrderIds !== undefined ? cardOrderIds : column.cardOrderIds;
    column.updatedAt = Date.now();
    await column.save();
    res.json(column);
  } catch (error) {
    next(error);
  }
};


module.exports = { createColumn, getColumnsByBoard, getColumnById, updateColumn, deleteColumn, authMiddleware };