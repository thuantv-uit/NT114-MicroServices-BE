const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Column = require('../models/columnModel');
const { updateBoardColumnOrder, getAllBoardById } = require('../services/board');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { validateUserAndBoardAccess } = require('../utils/permissions');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

// ─── Role Helpers ────────────────────────────────────────────────────────────

const getUserColumnRole = (column, board, userId) => {
  if (board.userId.toString() === userId) return 'owner';
  const member = column.memberIds.find(m => m.userId.toString() === userId);
  return member ? member.role : null;
};

const ROLE_HIERARCHY = { owner: 4, admin: 3, member: 2, viewer: 1 };

const hasMinRole = (role, minRole) => {
  if (!role) return false;
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
};

// ─── Auth Middleware ─────────────────────────────────────────────────────────

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

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /
 * Tạo column mới — chỉ board owner
 * ✅ Không cho phép tạo column trong template board
 */
const createColumn = async (req, res, next) => {
  try {
    const { title, boardId, backgroundColor } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);

    if (board.type === 'template') {
      throwError('Cannot create columns in a template board', STATUS_CODES.FORBIDDEN);
    }

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

/**
 * PUT /:columnId
 * Cập nhật column — member trở lên
 * ✅ Không cho phép sửa column trong template board
 */
const updateColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { title, backgroundColor, cardOrderIds } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);

    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);

    if (board.type === 'template') {
      throwError('Cannot update columns in a template board', STATUS_CODES.FORBIDDEN);
    }

    const role = getUserColumnRole(column, board, req.user.id);
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

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

/**
 * DELETE /:columnId
 * Xóa column — admin hoặc board owner
 * ✅ Không cho phép xóa column trong template board
 */
const deleteColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);

    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);

    if (board.type === 'template') {
      throwError('Cannot delete columns in a template board', STATUS_CODES.FORBIDDEN);
    }

    const role = getUserColumnRole(column, board, req.user.id);
    if (!hasMinRole(role, 'admin')) {
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

/**
 * GET /board/:boardId
 * Lấy danh sách columns trong board
 * ✅ Template board: ai cũng thấy toàn bộ columns, không cần check memberIds
 */
const getColumnsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }

    // ✅ Dùng getAllBoardById — không check quyền, chỉ cần biết board.type và columnOrderIds
    const board = await getAllBoardById(boardId, token);
    if (!board) throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const allColumns = await Column.find({ boardId });
    const orderedIds = board.columnOrderIds.map(id => id.toString());
    const validColumns = allColumns
      .filter(col => orderedIds.includes(col._id.toString()))
      .sort((a, b) => orderedIds.indexOf(a._id.toString()) - orderedIds.indexOf(b._id.toString()));

    // ✅ Template board — trả về tất cả, không check memberIds
    if (board.type === 'template') {
      return res.json(validColumns);
    }

    // Board thường — validate quyền
    const { board: checkedBoard } = await validateUserAndBoardAccess(boardId, req.user.id, token);

    if (checkedBoard.userId.toString() === req.user.id) {
      return res.json(validColumns);
    }

    const accessibleColumns = validColumns.filter(col =>
      col.memberIds.some(m => m.userId.toString() === req.user.id)
    );

    res.json(accessibleColumns);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:columnId
 * Lấy column theo ID
 * ✅ Template column: ai cũng xem được
 */
const getColumnById = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);

    // ✅ Dùng getAllBoardById để check board.type mà không cần quyền membership
    const board = await getAllBoardById(column.boardId, token);
    if (board?.type === 'template') {
      return res.json(column);
    }

    await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    res.json(column);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /all/:columnId
 * Internal endpoint — không check quyền
 */
const getColumnByIdForAll = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);

    res.json(column);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /:columnId/memberIds
 * Cập nhật memberIds — dùng khi user accept invitation
 */
const updateColumnMemberIds = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { memberIds } = req.body;

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);

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
  updateColumnMemberIds,
};