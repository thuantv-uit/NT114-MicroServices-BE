const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Board = require('../models/boardModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/user');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { checkBoardInvitation } = require('../services/invitation');
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

const validateUserAndBoardAccess = async (boardId, userId, token) => {
  const user = await checkUserExists(userId, token);
  if (!user) {
    throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  const board = await Board.findById(boardId);
  if (!board) {
    throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  return { user, board };
};

const createBoard = async (req, res, next) => {
  try {
    const { title, description, backgroundColor } = req.body;
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = new Board({
      title,
      description,
      backgroundColor,
      userId: req.user.id,
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
    const invitations = await checkBoardInvitation(null, req.user.id, token); // Lấy tất cả lời mời board
    const boardIds = invitations ? invitations.map(inv => inv.boardId) : [];
    const boards = await Board.find({
      $or: [{ userId: req.user.id }, { _id: { $in: boardIds } }],
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
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const invitation = await checkBoardInvitation(id, req.user.id, token);
    const board = await Board.findOne({
      $or: [{ _id: id, userId: req.user.id }, { _id: id, _id: invitation?.boardId }],
    });
    if (!board) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED_OR_BOARD_NOT_FOUND, STATUS_CODES.FORBIDDEN);
    }
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
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    if (title) board.title = title;
    if (description) board.description = description;
    if (backgroundColor) board.backgroundColor = backgroundColor;
    if (columnOrderIds) {
      if (columnOrderIds.$push) {
        if (!isValidObjectId(columnOrderIds.$push)) {
          throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
        }
        board.columnOrderIds.push(columnOrderIds.$push);
      } else if (Array.isArray(columnOrderIds)) {
        if (columnOrderIds.some(id => !isValidObjectId(id))) {
          throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
        }
        board.columnOrderIds = columnOrderIds;
      }
    }
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
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    await board.deleteOne();
    res.json({ message: ERROR_MESSAGES.BOARD_DELETED });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
};