const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Column = require('../models/columnModel');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { updateBoardColumnOrder } = require('../services/board');
const { validateUserAndBoardAccess } = require('../utils/permissions');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

// ─── Role Helpers ────────────────────────────────────────────────────────────

/**
 * Lấy role của user trong column.
 * Trả về 'owner' nếu là board owner, 'admin' | 'member' | 'viewer' nếu có trong memberIds, null nếu không có quyền.
 */
const getUserColumnRole = (column, board, userId) => {
  if (board.userId.toString() === userId) return 'owner';

  const member = column.memberIds.find(
    m => m.userId.toString() === userId
  );
  return member ? member.role : null;
};

/**
 * Kiểm tra role có đủ quyền không theo thứ tự phân cấp:
 * owner > admin > member > viewer
 */
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
 */
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

/**
 * PUT /:columnId
 * Cập nhật column (title, backgroundColor, cardOrderIds) — member trở lên
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
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }

    const { board } = await validateUserAndBoardAccess(column.boardId, req.user.id, token);
    const role = getUserColumnRole(column, board, req.user.id);

    // Cần ít nhất role member để edit column
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    // Validate cardOrderIds nếu được gửi
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
 */
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
    const role = getUserColumnRole(column, board, req.user.id);

    // Cần ít nhất role admin để xóa column
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
 * Lấy danh sách columns trong board:
 * - Board owner: thấy tất cả columns
 * - Còn lại: chỉ thấy các columns mình có trong memberIds (bất kể role)
 */
const getColumnsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { board } = await validateUserAndBoardAccess(boardId, req.user.id, token);

    const allColumns = await Column.find({ boardId });

    // Lọc ra các column nằm trong columnOrderIds của board (đã hợp lệ)
    const validColumns = allColumns.filter(col =>
      board.columnOrderIds.includes(col._id.toString())
    );

    // Board owner thấy tất cả
    if (board.userId.toString() === req.user.id) {
      return res.json(validColumns);
    }

    // Các user khác chỉ thấy column họ có trong memberIds
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
 * Lấy column theo ID — viewer trở lên (có trong memberIds) hoặc board owner
 */
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
    const role = getUserColumnRole(column, board, req.user.id);

    // Cần ít nhất viewer để xem column
    // if (!hasMinRole(role, 'viewer')) {
    //   throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    // }

    res.json(column);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /all/:columnId
 * Lấy column không kiểm tra quyền — dùng cho internal service call
 */
const getColumnByIdForAll = async (req, res, next) => {
  try {
    const { columnId } = req.params;

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }

    res.json(column);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /:columnId/memberIds
 * Cập nhật danh sách member trong column.
 * Không check role vì đây là bước user accept invitation —
 * lúc này user chưa có role trong memberIds nên không thể check quyền trước.
 * Chỉ cần đã authenticate (qua authMiddleware) là được phép gọi.
 */
const updateColumnMemberIds = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const { memberIds } = req.body;

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const column = await Column.findById(columnId);
    if (!column) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }

    column.memberIds = memberIds;
    column.updatedAt = Date.now();
    await column.save();

    res.json(column);
  } catch (error) {
    next(error);
  }
};

const getTemplateBoards = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const templates = await Board.find({ type: 'template' })
      .select('title description backgroundColor backgroundImage category columnOrderIds');

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

const createBoardFromTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const token = extractToken(req);

    const user = await checkUserExists(req.user.id, token);
    if (!user) throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);

    const template = await Board.findOne({ _id: id, type: 'template' });
    if (!template) throwError('Template not found', STATUS_CODES.NOT_FOUND);

    // Tạo board mới
    const newBoard = new Board({
      title: title || `Copy of ${template.title}`,
      description: template.description,
      backgroundColor: template.backgroundColor,
      backgroundImage: template.backgroundImage,
      userId: req.user.id,
      memberIds: [],
      columnOrderIds: [],
      type: 'private',
    });
    await newBoard.save();

    // Clone columns — gọi service
    const clonedColumnIds = await cloneColumnsFromTemplate(
      template._id,
      template.columnOrderIds,
      newBoard._id,
      token
    );

    newBoard.columnOrderIds = clonedColumnIds;
    await newBoard.save();

    res.status(STATUS_CODES.CREATED).json(newBoard);
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
  getTemplateBoards,
  createBoardFromTemplate,
};