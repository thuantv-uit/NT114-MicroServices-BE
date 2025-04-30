const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const { getColumnById, updateColumnCardOrder } = require('../services/column');
const { getBoardById } = require('../services/board');
const { checkCardInvitation, checkColumnInvitation, checkBoardInvitation, checkCardsInvitedInColumn } = require('../services/invitation');
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
      const tempColumn = await mongoose.model('Column').findById(columnId);
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
      const tempBoard = await mongoose.model('Board').findById(column.boardId);
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
    const columnInvitation = await checkColumnInvitation(null, columnId, userId, token);
    if (!columnInvitation.length) {
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
    // Kiểm tra column có tồn tại không
    const column = await getColumnById(columnId, req.user.id, token);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    
    // Kiểm tra quyền: board owner hoặc người được mời vào column
    if (board.userId.toString() !== req.user.id) {
      const columnInvitation = await checkColumnInvitation(null, columnId, req.user.id, token);
      if (!columnInvitation.length) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
      }
    }

    const card = new Card({ title, description, columnId });
    await card.save();

    // Cập nhật cardOrderIds trong column
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
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await getColumnById(columnId, req.user.id, token);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);

    const allCards = await Card.find({ columnId });

    if (board.userId.toString() === req.user.id) {
      return res.json(allCards);
    }

    const cardInvitations = await checkCardsInvitedInColumn(columnId, req.user.id, token);
    const allowedCardIds = cardInvitations
      .filter(inv => inv.status === 'accepted')
      .map(inv => inv.cardId.toString());
    const allowedCards = allCards.filter(card => allowedCardIds.includes(card._id.toString()));
    res.json(allowedCards);
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
    // Cho phép board owner hoặc người được mời vào card truy cập
    if (board.userId.toString() !== req.user.id) {
      const cardInvitations = await checkCardInvitation(id, req.user.id, token);
      if (!cardInvitations.some(inv => inv.status === 'accepted')) {
        throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
      }
    }
    res.json(card);
  } catch (error) {
    next(error);
  }
};

const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }
    const card = await Card.findById(id);
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);
    // Cho phép board owner hoặc người được mời vào card xóa
    if (board.userId.toString() !== req.user.id) {
      const cardInvitations = await checkCardInvitation(id, req.user.id, token);
      if (!cardInvitations.some(inv => inv.status === 'accepted')) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_CARD, STATUS_CODES.FORBIDDEN);
      }
    }
    await card.deleteOne();
    const newCardOrderIds = column.cardOrderIds.filter(cardId => cardId.toString() !== id);
    await updateColumnCardOrder(column._id, newCardOrderIds, token);

    res.json({ message: ERROR_MESSAGES.CARD_DELETED });
  } catch (error) {
    next(error);
  }
};

const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }
    const card = await Card.findById(id);
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);
    // Cho phép board owner hoặc người được mời vào card sửa
    if (board.userId.toString() !== req.user.id) {
      const cardInvitations = await checkCardInvitation(id, req.user.id, token);
      if (!cardInvitations.some(inv => inv.status === 'accepted')) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_CARD, STATUS_CODES.FORBIDDEN);
      }
    }
    card.title = title !== undefined ? title : card.title;
    card.description = description !== undefined ? description : card.description;
    card.updatedAt = Date.now();
    await card.save();

    res.json(card);
  } catch (error) {
    next(error);
  }
};

module.exports = { createCard, getCardsByColumn, getCardById, updateCard, deleteCard, authMiddleware };