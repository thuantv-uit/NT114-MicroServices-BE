const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Card = require('../models/cardModel');
const { getColumnById, updateColumnCardOrder, getColumnsByBoard } = require('../services/column');
const { getBoardById } = require('../services/board');
const { checkColumnInvitation } = require('../services/invitation');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { validateUserAndBoardAccess } = require('../utils/permissions');
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
  if (board.userId.toString() !== userId) {
    const columnInvitations = await checkColumnInvitation(null, columnId, userId, token);
    if (!columnInvitations.some(inv => inv.status === 'accepted')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }
  }
  return { column, board };
};

const createCard = async (req, res, next) => {
  try {
    const { title, description, columnId, process, deadline } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await getColumnById(columnId, req.user.id, token);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    
    if (board.userId.toString() !== req.user.id) {
      const columnInvitations = await checkColumnInvitation(null, columnId, req.user.id, token);
      if (!columnInvitations.some(inv => inv.status === 'accepted')) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
      }
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
      userId: req.user.id
    });
    await card.save();

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

    const isBoardOwner = board.userId.toString() === req.user.id;
    let hasColumnAccess = false;
    if (!isBoardOwner) {
      const columnInvitations = await checkColumnInvitation(null, columnId, req.user.id, token);
      hasColumnAccess = columnInvitations.some(inv => inv.status === 'accepted');
    }

    if (!isBoardOwner && !hasColumnAccess) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    const allCards = await Card.find({ columnId });
    res.json(allCards);
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
    const { title, description, process, deadline } = req.body;
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
    if (!card) {
      throwError(ERROR_MESSAGES.CARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (!card.columnId || !isValidObjectId(card.columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { column, board } = await validateColumnAndBoard(card.columnId, req.user.id, token);

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

const getCardsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);

    const columns = await getColumnsByBoard(boardId, token);

    const columnIds = columns.map(column => column._id);
    const cards = await Card.find({ columnId: { $in: columnIds } }).select('title deadline process');

    res.json(cards);
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
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

    card.comments.push({ text });
    await card.save();

    res.status(STATUS_CODES.CREATED).json(card.comments[card.comments.length - 1]);
  } catch (error) {
    next(error);
  }
};

const getCommentsByCard = async (req, res, next) => {
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