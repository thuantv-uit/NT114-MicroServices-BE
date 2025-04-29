const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const { getColumnById, updateColumnCardOrder } = require('../services/column');
const { getBoardById } = require('../services/board');
const { checkCardInvitation, checkColumnInvitation } = require('../services/invitation');
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

const validateColumnAndBoard = async (columnId, userId, token) => {
  let column;
  try {
    column = await getColumnById(columnId, userId, token);
  } catch (error) {
    if (error.statusCode === STATUS_CODES.NOT_FOUND) {
      throwError(ERROR_MESSAGES.COLUMN_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (error.statusCode === STATUS_CODES.FORBIDDEN) {
      const tempColumn = await Column.findById(columnId);
      if (!tempColumn) {
        throwError(ERROR_MESSAGES.COLUMN_NOT_FOUND, STATUS_CODES.NOT_FOUND);
      }
      column = tempColumn;
    } else {
      throw error;
    }
  }
  let board;
  try {
    board = await getBoardById(column.boardId, userId, token);
  } catch (error) {
    if (error.statusCode === STATUS_CODES.NOT_FOUND || error.statusCode === STATUS_CODES.FORBIDDEN) {
      // Board owner không cần lời mời board, truy vấn trực tiếp
      const tempBoard = await Board.findById(column.boardId);
      if (!tempBoard) {
        throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
      }
      board = tempBoard;
    } else {
      throw error;
    }
  }
  // Chỉ kiểm tra lời mời column nếu không phải board owner
  if (board.userId.toString() !== userId) {
    const columnInvitation = await checkColumnInvitation(columnId, userId, token);
    if (!columnInvitation) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }
  }
  return { column, board };
};

const createCard = async (req, res, next) => {
  try {
    const { title, description, columnId } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    // Kiểm tra column có tồn tại không bằng cách gọi API của Column Service
    const column = await getColumnById(columnId, req.user.id, token);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    // Chỉ board owner được tạo card
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    const card = new Card({ title, description, columnId });
    await card.save();

    // Cập nhật cardOrderIds trong column bằng cách gọi API của Column Service
    const newCardOrderIds = [...(column.cardOrderIds || []), card._id.toString()];
    await updateColumnCardOrder(columnId, newCardOrderIds, token);

    res.status(STATUS_CODES.CREATED).json(card);
  } catch (error) {
    next(error);
  }
};

const getCardsByColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);
    const { board } = await validateColumnAndBoard(columnId, req.user.id, token);
    let cardIds = [];
    // Board owner thấy tất cả card trong column
    if (board.userId.toString() === req.user.id) {
      const cards = await Card.find({ columnId });
      cardIds = cards.map(card => card._id);
    } else {
      const invitations = await checkCardInvitation(null, req.user.id, token);
      cardIds = invitations
        ? invitations.filter(inv => inv.columnId.toString() === columnId).map(inv => inv.cardId)
        : [];
    }
    const cards = await Card.find({ columnId, _id: { $in: cardIds } });
    res.json(cards);
  } catch (error) {
    next(error);
  }
};

const getCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }
    const card = await Card.findById(id);
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);
    // Cho phép board owner truy cập mà không cần lời mời card
    if (board.userId.toString() !== req.user.id) {
      const cardInvitation = await checkCardInvitation(id, req.user.id, token);
      if (!cardInvitation) {
        throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
      }
    }
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const token = extractToken(req);
    const card = await Card.findById(id);
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);
    const cardInvitation = await checkCardInvitation(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id && !cardInvitation) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    card.title = title || card.title;
    card.description = description || card.description;
    card.updatedAt = Date.now();
    await card.save();
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    const card = await Card.findById(id);
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);
    const cardInvitation = await checkCardInvitation(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id && !cardInvitation) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    await card.deleteOne();
    res.json({ message: ERROR_MESSAGES.CARD_DELETED });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCard, getCardsByColumn, getCardById, updateCard, deleteCard, authMiddleware };