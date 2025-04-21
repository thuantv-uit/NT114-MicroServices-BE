const jwt = require('jsonwebtoken');
const Card = require('../models/cardModel');
const { getColumnById, updateColumnCardOrder } = require('../services/column');
const { getBoardById } = require('../services/board');
const { extractToken, throwError } = require('../utils/helpers');
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

const validateColumnAndBoard = async (columnId, userId, token) => {
  const column = await getColumnById(columnId, userId, token);
  if (!column) {
    throwError(ERROR_MESSAGES.COLUMN_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  const board = await getBoardById(column.boardId, userId, token);
  if (!board) {
    throwError(ERROR_MESSAGES.UNAUTHORIZED_OR_BOARD_NOT_FOUND, STATUS_CODES.FORBIDDEN);
  }

  return { column, board };
};

const createCard = async (req, res, next) => {
  try {
    const { title, description, columnId } = req.body;
    const token = extractToken(req);

    const { column } = await validateColumnAndBoard(columnId, req.user.id, token);

    const card = new Card({ title, description, columnId });
    await card.save();

    await updateColumnCardOrder(columnId, card._id, token);

    res.status(STATUS_CODES.CREATED).json(card);
  } catch (error) {
    next(error);
  }
};

const getCardsByColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);

    await validateColumnAndBoard(columnId, req.user.id, token);

    const cards = await Card.find({ columnId });
    res.json(cards);
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

    await validateColumnAndBoard(card.columnId, req.user.id, token);

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
      throwError(ERROR_MESSAGES.CARD来到了NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    await validateColumnAndBoard(card.columnId, req.user.id, token);

    await card.deleteOne();
    res.json({ message: ERROR_MESSAGES.CARD_DELETED });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCard, getCardsByColumn, updateCard, deleteCard, authMiddleware };