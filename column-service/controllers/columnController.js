const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Column = require('../models/columnModel');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { updateBoardColumnOrder } = require('../services/board');
const { checkColumnInvitation } = require('../services/invitation');
const { validateUserAndBoardAccess } = require('../utils/permissions');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

// Middleware xác thực token
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

const createColumn = async (req, res, next) => {
  try {
    const { title, boardId, backgroundColor } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    const column = new Column({ title, boardId, backgroundColor, memberIds: [] });
    await column.save();

    const newColumnOrderIds = [...(board.columnOrderIds || []), column._id.toString()];
    await updateBoardColumnOrder(boardId, newColumnOrderIds, token);

    res.status(STATUS_CODES.CREATED).json(column);
  } catch (error) {
    next(error);
  }
};

// need to fix 
const updateColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { title, backgroundColor, cardOrderIds} = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);

    // Kiểm tra quyền: chủ sở hữu bảng hoặc người được mời vào cột
    const isBoardOwner = board.userId.toString() === req.user.id;
    let hasColumnAccess = false;
    if (!isBoardOwner) {
      const columnInvitations = await checkColumnInvitation(null, columnId, req.user.id, token);
      hasColumnAccess = columnInvitations.some(inv => inv.status === 'accepted');
    }

    if (!isBoardOwner && !hasColumnAccess) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    // Kiểm tra cardOrderIds nếu được gửi
    if (cardOrderIds !== undefined) {
      if (!Array.isArray(cardOrderIds)) {
        throwError('cardOrderIds phải là một mảng', STATUS_CODES.BAD_REQUEST);
      }
      cardOrderIds.forEach(id => {
        if (!isValidObjectId(id)) {
          throwError(`ID thẻ không hợp lệ trong cardOrderIds: ${id}`, STATUS_CODES.BAD_REQUEST);
        }
      });
    }

    column.title = title !== undefined ? title : column.title;
    column.backgroundColor = backgroundColor !== undefined ? backgroundColor : column.backgroundColor;
    column.cardOrderIds = cardOrderIds !== undefined ? cardOrderIds : column.cardOrderIds;
    column.updatedAt = Date.now();
    await column.save();
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
    // Chỉ board owner được xóa column
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    await column.deleteOne();

    const newColumnOrderIds = board.columnOrderIds.filter(id => id.toString() !== columnId);
    await updateBoardColumnOrder(column.boardId, newColumnOrderIds, token);

    res.json({ message: ERROR_MESSAGES.COLUMN_DELETED });
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
    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);

    const allColumns = await Column.find({ boardId });

    const validColumns = allColumns.filter(col => board.columnOrderIds.includes(col._id.toString()));

    if (board.userId.toString() === req.user.id) {
      return res.json(validColumns);
    }

    const columnInvitations = await checkColumnInvitation(boardId, null, req.user.id, token);
    const allowedColumnIds = columnInvitations ? columnInvitations.map(inv => inv.columnId.toString()) : [];
    const allowedColumns = validColumns.filter(col => allowedColumnIds.includes(col._id.toString()));
    res.json(allowedColumns);
  } catch (error) {
    next(error);
  }
};

const getColumnById = async (req, res, next) => {
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
      const columnInvitations = await checkColumnInvitation(column.boardId, columnId, req.user.id, token);
      const hasInvitation = columnInvitations.some(inv => inv.columnId.toString() === columnId);
      if (!hasInvitation) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
      }
    }

    res.json(column);
  } catch (error) {
    next(error);
  }
};

const getColumnByIdForAll = async (req, res, next) => {
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
    // Chỉ kiểm tra user tồn tại, không kiểm tra quyền truy cập
    // const user = await checkUserExists(req.user.id, token);
    // if (!user) {
    //   throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    // }

    res.json(column);
  } catch (error) {
    next(error);
  }
};

const updateColumnMemberIds = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { memberIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }
    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);

    // Bất kỳ người dùng đã xác thực nào có thể cập nhật memberIds
    column.memberIds = memberIds;
    column.updatedAt = Date.now();
    await column.save();
    res.json(column);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  createColumn,
  updateColumn,
  deleteColumn,
  getColumnsByBoard,
  getColumnById,
  getColumnByIdForAll,
  updateColumnMemberIds
};
