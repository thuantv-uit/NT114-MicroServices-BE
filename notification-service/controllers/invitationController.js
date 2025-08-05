const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Invitation = require('../models/invitationModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/user');
const { getBoardById, updateMemberIds } = require('../services/board');
const { getColumnById } = require('../services/column');
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

const validateInvitation = async (type, boardId, columnId, userId, invitedUserId, token) => {
  // Validate ObjectIDs
  if (!isValidObjectId(boardId) || !isValidObjectId(userId) || !isValidObjectId(invitedUserId)) {
    throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
  }

  // Check if invited user exists
  const invitedUser = await checkUserExists(invitedUserId, token);
  if (!invitedUser) {
    throwError(`${ERROR_MESSAGES.USER_NOT_FOUND}: ${invitedUserId}`, STATUS_CODES.NOT_FOUND);
  }

  // Verify board existence and ownership
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

  // For non-board invitations, ensure the invited user has accepted a board invitation
  if (type === 'column') {
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

    // Validate column
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    let column;
    try {
      column = await getColumnById(columnId, userId, token);
    } catch (error) {
      throwError(
        `${ERROR_MESSAGES.NOT_FOUND_COLUMN}: columnId ${columnId} not accessible`,
        STATUS_CODES.NOT_FOUND
      );
    }
    if (!column || column.boardId.toString() !== boardId.toString()) {
      throwError(
        `${ERROR_MESSAGES.NOT_FOUND_COLUMN}: columnId ${columnId} does not exist or does not belong to board ${boardId}`,
        STATUS_CODES.NOT_FOUND
      );
    }
  }
};

const inviteToBoard = async (req, res, next) => {
  try {
    const { boardId, email, role } = req.body;
    const token = extractToken(req);
    const invitedUser = await checkUserExistsByEmail(email, token);
    if (!invitedUser) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    await validateInvitation('board', boardId, null, req.user.id, invitedUser._id, token);
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
      role: role || 'viewer', // Default to 'member' if no role is provided
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
    await validateInvitation('column', boardId, columnId, req.user.id, invitedUser._id, token);
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

// const acceptInvitation = async (req, res, next) => {
//   try {
//     const { invitationId } = req.params;
//     const token = extractToken(req);
//     if (!isValidObjectId(invitationId)) {
//       throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
//     }
//     const invitation = await Invitation.findById(invitationId);
//     if (!invitation) {
//       throwError(ERROR_MESSAGES.INVITATION_NOT_FOUND, STATUS_CODES.NOT_FOUND);
//     }
//     if (invitation.userId.toString() !== req.user.id) {
//       throwError(ERROR_MESSAGES.UNAUTHORIZED, STATUS_CODES.FORBIDDEN);
//     }
//     if (invitation.status !== 'pending') {
//       throwError(ERROR_MESSAGES.INVITATION_NOT_PENDING, STATUS_CODES.BAD_REQUEST);
//     }
//     invitation.status = 'accepted';
//     await invitation.save();
//     res.json({ 
//       message: invitation.type === 'board' 
//         ? 'Board invitation accepted. You need a column invitation to view or edit content.' 
//         : 'Column invitation accepted. You can now view and edit cards in this column.', 
//       invitation 
//     });
//   } catch (error) {
//     next(error);
//   }
// };

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

    // Cập nhật memberIds trong board nếu là lời mời board
    if (invitation.type === 'board') {
      // const { updateMemberIds, getBoardById } = require('../services/board'); // Import cả getBoardById và updateMemberIds
      const board = await getBoardById(invitation.boardId, req.user.id, token);
      if (!board) {
        throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
      }
      const newMember = {
        userId: invitation.userId,
        role: invitation.role || 'member', // Sử dụng role từ invitation
      };
      // Kiểm tra trùng lặp dựa trên dữ liệu từ getBoardById
      const currentMemberIds = board.memberIds || [];
      if (!currentMemberIds.some(member => member.userId.toString() === newMember.userId.toString())) {
        const updatedMemberIds = [...currentMemberIds, newMember];
        await updateMemberIds(invitation.boardId, updatedMemberIds, token);
      }
    }

    res.json({
      message: invitation.type === 'board'
        ? 'Board invitation accepted. You need a column invitation to view or edit content.'
        : 'Column invitation accepted. You can now view and edit cards in this column.',
      invitation,
    });
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
      status: 'accepted',
    }).select('boardId columnId status createdAt updatedAt');
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getPendingBoardInvitations = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const invitations = await Invitation.find({
      userId,
      type: 'board',
      status: 'pending',
    });
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

const getPendingColumnInvitations = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(userId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const invitations = await Invitation.find({
      userId,
      type: 'column',
      status: 'pending',
    });
    res.json(invitations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  inviteToBoard,
  inviteToColumn,
  acceptInvitation,
  rejectInvitation,
  getBoardInvitations,
  getColumnInvitations,
  getAllColumnsInvited,
  getPendingBoardInvitations,
  getPendingColumnInvitations,
};