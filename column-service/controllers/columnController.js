const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Column = require('../models/columnModel');
const { checkUserExists } = require('../services/user');
const { checkBoardAccess, updateBoardColumnOrder } = require('../services/board');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

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
    const { title, boardId, cardOrderIds = [] } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    await validateUserAndBoard(boardId, req.user.id, token);

    const column = new Column({ title, boardId, cardOrderIds });
    await column.save();

    await updateBoardColumnOrder(boardId, column._id, token);

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
      throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    await validateUserAndBoard(boardId, req.user.id, token);

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

    await validateUserAndBoard(column.boardId, req.user.id, token);

    res.json(column);
  } catch (error) {
    next(error);
  }
};

const updateColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, cardOrderIds } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(id);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }

    await validateUserAndBoard(column.boardId, req.user.id, token);

    if (title) column.title = title;
    
    if (cardOrderIds) {
      if (cardOrderIds.$push) {
        if (!isValidObjectId(cardOrderIds.$push)) {
          throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
        }
        column.cardOrderIds.push(cardOrderIds.$push);
      } else if (Array.isArray(cardOrderIds)) {
        if (cardOrderIds.some(id => !isValidObjectId(id))) {
          throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
        }
        column.cardOrderIds = cardOrderIds;
      }
    }

    await column.save();
    res.json(column);
  } catch (error) {
    next(error);
  }
};

const deleteColumn = async (req, res, next) => {
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

    await validateUserAndBoard(column.boardId, req.user.id, token);

    await column.deleteOne();
    res.json({ message: ERROR_MESSAGES.COLUMN_DELETED });
  } catch (error) {
    next(error);
  }
};

module.exports = { createColumn, getColumnsByBoard, getColumnById, updateColumn, deleteColumn, authMiddleware };