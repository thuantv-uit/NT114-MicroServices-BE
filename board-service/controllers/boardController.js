const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Board = require('../models/boardModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/user');
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

const validateUserAndBoardAccess = async (boardId, userId, token, checkOwnership = false) => {
  if (!isValidObjectId(boardId)) {
    throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  const isOwner = board.userId.toString() === userId;
  const isMember = board.memberIds.map(id => id.toString()).includes(userId);

  if (checkOwnership && !isOwner) {
    throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
  } else if (!checkOwnership && !isOwner && !isMember) {
    throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
  }

  return board;
};

const createBoard = async (req, res) => {
  const { title, description, memberIds = [], columnOrderIds = [] } = req.body;
  const token = extractToken(req);

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    if (memberIds.some(id => !isValidObjectId(id)) || columnOrderIds.some(id => !isValidObjectId(id))) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }

    const board = new Board({
      title,
      description,
      userId: req.user.id,
      memberIds,
      columnOrderIds,
    });
    await board.save();

    res.status(STATUS_CODES.CREATED).json(board);
  } catch (error) {
    throwError(error.message || ERROR_MESSAGES.SERVER_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const getBoards = async (req, res) => {
  const token = extractToken(req);

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    const boards = await Board.find({
      $or: [{ userId: req.user.id }, { memberIds: req.user.id }],
    });
    res.json(boards);
  } catch (error) {
    throwError(error.message || ERROR_MESSAGES.SERVER_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const getBoardById = async (req, res) => {
  const { id } = req.params;
  const token = extractToken(req);

  const board = await validateUserAndBoardAccess(id, req.user.id, token);
  res.json(board);
};

const updateBoard = async (req, res) => {
  const { id } = req.params;
  const { title, description, memberIds, columnOrderIds } = req.body;
  const token = extractToken(req);

  const board = await validateUserAndBoardAccess(id, req.user.id, token, true);

  try {
    if (title) board.title = title;
    if (description) board.description = description;
    if (memberIds) {
      if (memberIds.some(id => !isValidObjectId(id))) {
        throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
      }
      board.memberIds = memberIds;
    }
    if (columnOrderIds) {
      if (columnOrderIds.$push) {
        if (!isValidObjectId(columnOrderIds.$push)) {
          throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
        }
        board.columnOrderIds.push(columnOrderIds.$push);
      } else if (Array.isArray(columnOrderIds)) {
        if (columnOrderIds.some(id => !isValidObjectId(id))) {
          throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
        }
        board.columnOrderIds = columnOrderIds;
      }
    }

    await board.save();
    res.json(board);
  } catch (error) {
    throwError(error.message || ERROR_MESSAGES.SERVER_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const deleteBoard = async (req, res) => {
  const { id } = req.params;
  const token = extractToken(req);

  const board = await validateUserAndBoardAccess(id, req.user.id, token, true);

  await board.deleteOne();
  res.json({ message: ERROR_MESSAGES.BOARD_DELETED });
};

const inviteUserToBoard = async (req, res) => {
  const { boardId, email } = req.body;
  const token = extractToken(req);

  const board = await validateUserAndBoardAccess(boardId, req.user.id, token, true);

  try {
    const userResponse = await checkUserExistsByEmail(email, token);
    if (!userResponse) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND_BY_EMAIL, STATUS_CODES.NOT_FOUND);
    }

    const invitedUserId = userResponse._id;
    if (board.memberIds.includes(invitedUserId)) {
      throwError(ERROR_MESSAGES.USER_ALREADY_MEMBER, STATUS_CODES.BAD_REQUEST);
    }

    board.memberIds.push(invitedUserId);
    await board.save();

    res.status(STATUS_CODES.OK).json({ message: ERROR_MESSAGES.USER_INVITED, board });
  } catch (error) {
    throwError(error.message || ERROR_MESSAGES.SERVER_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteUserToBoard,
  authMiddleware,
};