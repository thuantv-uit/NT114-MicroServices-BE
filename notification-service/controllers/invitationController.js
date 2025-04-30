const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Invitation = require('../models/invitationModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/user');
const { getBoardById } = require('../services/board');
const { getColumnById } = require('../services/column');
const { getCardById } = require('../services/card');
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

const validateInvitation = async (type, boardId, columnId, cardId, userId, invitedUserId, token) => {
  if (!isValidObjectId(boardId) || !isValidObjectId(userId) || !isValidObjectId(invitedUserId)) {
    throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
  }
  const invitedUser = await checkUserExists(invitedUserId, token);
  if (!invitedUser) {
    throwError(`${ERROR_MESSAGES.USER_NOT_FOUND}: ${invitedUserId}`, STATUS_CODES.NOT_FOUND);
  }
  let board;
  try {
    board = await getBoardById(boardId, userId, token);
  } catch (error) {
    throwError(`${ERROR_MESSAGES.UNAUTHORIZED_OR_BOARD_NOT_FOUND}: boardId ${boardId}`, STATUS_CODES.FORBIDDEN);
  }
  if (!board) {
    throwError(`${ERROR_MESSAGES.BOARD_NOT_FOUND}: boardId ${boardId}`, STATUS_CODES.NOT_FOUND);
  }
  if (board.userId.toString() !== userId) {
    throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
  }
  if (type !== 'board') {
    const boardInvitation = await Invitation.findOne({
      type: 'board',
      boardId,
      userId: invitedUserId,
      status: 'accepted',
    });
    if (!boardInvitation) {
      throwError(
        `${ERROR_MESSAGES.NOT_INVITED_TO_BOARD}: user ${invitedUser.email} (ID: ${invitedUserId}) must be invited to board ${boardId} first`,
        STATUS_CODES.FORBIDDEN
      );
    }
  }
  if (type === 'column' || type === 'card') {
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    let column;
    try {
      column = await getColumnById(columnId, userId, token);
    } catch (error) {
      if (error.statusCode === STATUS_CODES.FORBIDDEN) {
        try {
          const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/${columnId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          column = response.data;
        } catch (err) {
          throwError(
            `${ERROR_MESSAGES.NOT_FOUND_COLUMN}: columnId ${columnId} not accessible`,
            STATUS_CODES.NOT_FOUND
          );
        }
      } else {
        throw error;
      }
    }
    if (!column || column.boardId.toString() !== boardId.toString()) {
      throwError(
        `${ERROR_MESSAGES.NOT_FOUND_COLUMN}: columnId ${columnId} does not exist or does not belong to board ${boardId}`,
        STATUS_CODES.NOT_FOUND
      );
    }
  }
  if (type === 'card') {
    if (!isValidObjectId(cardId)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }
    let card;
    try {
      card = await getCardById(cardId, userId, token);
    } catch (error) {
      if (error.statusCode === STATUS_CODES.FORBIDDEN) {
        try {
          const response = await axios.get(`${CARD_SERVICE_URL}/api/cards/${cardId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          card = response.data;
        } catch (err) {
          throwError(
            `${ERROR_MESSAGES.CARD_NOT_FOUND}: cardId ${cardId} not accessible`,
            STATUS_CODES.NOT_FOUND
          );
        }
      } else {
        throw error;
      }
    }
    if (!card) {
      throwError(`${ERROR_MESSAGES.CARD_NOT_FOUND}: cardId ${cardId} does not exist`, STATUS_CODES.NOT_FOUND);
    }
    if (card.columnId.toString() !== columnId.toString()) {
      throwError(
        `${ERROR_MESSAGES.CARD_NOT_FOUND}: cardId ${cardId} does not belong to column ${columnId}`,
        STATUS_CODES.NOT_FOUND
      );
    }
    const columnInvitation = await Invitation.findOne({
      type: 'column',
      boardId,
      columnId,
      userId: invitedUserId,
      status: 'accepted',
    });
    if (!columnInvitation) {
      throwError(
        `${ERROR_MESSAGES.NOT_INVITED_TO_COLUMN}: user ${invitedUser.email} (ID: ${invitedUserId}) must be invited to column ${columnId}`,
        STATUS_CODES.FORBIDDEN
      );
    }
  }
};

const inviteToBoard = async (req, res, next) => {
  try {
    const { boardId, email } = req.body;
    const token = extractToken(req);
    const invitedUser = await checkUserExistsByEmail(email, token);
    if (!invitedUser) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    await validateInvitation('board', boardId, null, null, req.user.id, invitedUser._id, token);
    const existingInvitation = await Invitation.findOne({
      type: 'board',
      boardId,
      userId: invitedUser._id,
      status: 'pending',
    });
    if (existingInvitation) {
      throwError(ERROR_MESSAGES.ALREADY_INVITED, STATUS_CODES.BAD_REQUEST);
    }
    const invitation = new Invitation({
      type: 'board',
      boardId,
      userId: invitedUser._id,
      invitedBy: req.user.id,
    });
    await invitation.save();
    res.status(STATUS_CODES.CREATED).json({ message: ERROR_MESSAGES.INVITATION_SENT, invitation });
  } catch (error) {
    next(error);
  }
};

const inviteToColumn = async (req, res, next) => {
  try {
    const { boardId, columnId, email } = req.body;
    const token = extractToken(req);
    const invitedUser = await checkUserExistsByEmail(email, token);
    if (!invitedUser) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    await validateInvitation('column', boardId, columnId, null, req.user.id, invitedUser._id, token);
    const existingInvitation = await Invitation.findOne({
      type: 'column',
      boardId,
      columnId,
      userId: invitedUser._id,
      status: 'pending',
    });
    if (existingInvitation) {
      throwError(ERROR_MESSAGES.ALREADY_INVITED, STATUS_CODES.BAD_REQUEST);
    }
    const invitation = new Invitation({
      type: 'column',
      boardId,
      columnId,
      userId: invitedUser._id,
      invitedBy: req.user.id,
    });
    await invitation.save();
    res.status(STATUS_CODES.CREATED).json({ message: ERROR_MESSAGES.INVITATION_SENT, invitation });
  } catch (error) {
    next(error);
  }
};

const assignToCard = async (req, res, next) => {
  try {
    const { boardId, columnId, cardId, email } = req.body;
    const token = extractToken(req);
    const invitedUser = await checkUserExistsByEmail(email, token);
    if (!invitedUser) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    await validateInvitation('card', boardId, columnId, cardId, req.user.id, invitedUser._id, token);
    const existingInvitation = await Invitation.findOne({
      type: 'card',
      boardId,
      columnId,
      cardId,
      userId: invitedUser._id,
      status: 'pending',
    });
    if (existingInvitation) {
      throwError(ERROR_MESSAGES.ALREADY_INVITED, STATUS_CODES.BAD_REQUEST);
    }
    const invitation = new Invitation({
      type: 'card',
      boardId,
      columnId,
      cardId,
      userId: invitedUser._id,
      invitedBy: req.user.id,
    });
    await invitation.save();
    res.status(STATUS_CODES.CREATED).json({ message: ERROR_MESSAGES.INVITATION_SENT, invitation });
  } catch (error) {
    next(error);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(invitationId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (invitation.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    if (invitation.status !== 'pending') {
      throwError(ERROR_MESSAGES.INVITATION_NOT_PENDING, STATUS_CODES.BAD_REQUEST);
    }
    invitation.status = 'accepted';
    await invitation.save();
    res.json({ message: ERROR_MESSAGES.INVITATION_ACCEPTED, invitation });
  } catch (error) {
    next(error);
  }
};

const rejectInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(invitationId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (invitation.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    if (invitation.status !== 'pending') {
      throwError(ERROR_MESSAGES.INVITATION_NOT_PENDING, STATUS_CODES.BAD_REQUEST);
    }
    invitation.status = 'rejected';
    await invitation.save();
    res.json({ message: ERROR_MESSAGES.INVITATION_REJECTED, invitation });
  } catch (error) {
    next(error);
  }
};

const getBoardInvitations = async (req, res, next) => {
  try {
    const { boardId, userId } = req.params;
    const token = extractToken(req);
    if (boardId && !isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const query = { userId, type: 'board', status: 'accepted' };
    if (boardId) {
      query.boardId = boardId;
    }
    const invitations = await Invitation.find(query);
    if (boardId && !invitations.length) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getColumnInvitations = async (req, res, next) => {
  try {
    const { boardId, columnId, userId } = req.params;
    const token = extractToken(req);
    if (boardId && !isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    if (columnId && !isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const query = { userId, type: 'column', status: 'accepted' };
    if (boardId) query.boardId = boardId;
    if (columnId) query.columnId = columnId;
    const invitations = await Invitation.find(query);
    if (columnId && !invitations.length) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getCardInvitations = async (req, res, next) => {
  try {
    const { cardId, userId } = req.params;
    const token = extractToken(req);
    if (cardId && !isValidObjectId(cardId)) {
      throwError(ERROR_MESSAGES.INVALID_CARD_ID, STATUS_CODES.BAD_REQUEST);
    }
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const query = { userId, type: 'card', status: 'accepted' };
    if (cardId) query.cardId = cardId;
    const invitations = await Invitation.find(query);
    if (cardId && !invitations.length) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getAllColumnsInvited = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const token = extractToken(req);
    
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    
    const invitations = await Invitation.find({
      userId,
      type: 'column',
    }).select('boardId columnId status createdAt updatedAt');
    
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getCardsInvitedInColumn = async (req, res, next) => {
  try {
    const { columnId, userId } = req.params;
    const token = extractToken(req);
    
    if (!isValidObjectId(columnId) || !isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    
    const invitations = await Invitation.find({
      userId,
      type: 'card',
      columnId,
    }).select('boardId columnId cardId status createdAt updatedAt');
    
    if (!invitations.length) {
      throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  inviteToBoard,
  inviteToColumn,
  assignToCard,
  acceptInvitation,
  rejectInvitation,
  getBoardInvitations,
  getColumnInvitations,
  getCardInvitations,
  getAllColumnsInvited,
  getCardsInvitedInColumn,
};