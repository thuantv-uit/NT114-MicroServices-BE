const jwt = require('jsonwebtoken');
const Card = require('../models/cardModel');
const { getColumnById, getColumnByIdForAll, updateColumnCardOrder, getColumnsByBoard } = require('../services/column');
const { getBoardById } = require('../services/board');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { validateUserAndBoardAccess } = require('../utils/permissions');
const { streamUpload } = require('../config/CloudinaryProvider');

// ─── Auth Middleware ──────────────────────────────────────────────────────────

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

// ─── Role Helpers ─────────────────────────────────────────────────────────────

/**
 * Lấy role của user trong column dựa vào memberIds.
 * Trả về 'owner' nếu là board owner, 'admin' | 'member' | 'viewer' nếu có trong memberIds, null nếu không có quyền.
 */
const getUserColumnRole = (column, board, userId) => {
  if (board.userId.toString() === userId) return 'owner';

  const member = (column.memberIds || []).find(
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

// ─── Internal Helper ──────────────────────────────────────────────────────────

/**
 * Lấy column và board, đồng thời trả về role của user trong column.
 * Dùng getColumnByIdForAll để lấy column kèm memberIds mà không bị chặn bởi role check bên Column Service.
 * Card Service tự check role dựa vào memberIds trả về.
 */
const getColumnAndRole = async (columnId, userId, token) => {
  // Gọi endpoint /all/:columnId — không check quyền, trả về full column kèm memberIds
  const column = await getColumnByIdForAll(columnId, token);
  const board = await getBoardById(column.boardId, userId, token);
  const role = getUserColumnRole(column, board, userId);
  return { column, board, role };
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /
 * Tạo card mới — member trở lên
 */
const createCard = async (req, res, next) => {
  try {
    const { title, description, columnId, process, deadline } = req.body;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { column, board, role } = await getColumnAndRole(columnId, req.user.id, token);

    // Cần ít nhất member để tạo card
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
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
      userId: req.user.id,
    });
    await card.save();

    const newCardOrderIds = [...(column.cardOrderIds || []), card._id.toString()];
    await updateColumnCardOrder(columnId, newCardOrderIds, token);

    res.status(STATUS_CODES.CREATED).json(card);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /column/:columnId
 * Xem danh sách card trong column — viewer trở lên
 */
const getCardsByColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(columnId)) {
      throwError(ERROR_MESSAGES.INVALID_COLUMN_ID, STATUS_CODES.BAD_REQUEST);
    }

    const { role } = await getColumnAndRole(columnId, req.user.id, token);

    // Cần ít nhất viewer để xem card
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    const allCards = await Card.find({ columnId });
    res.json(allCards);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:id
 * Xem chi tiết card — viewer trở lên
 */
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

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Cần ít nhất viewer để xem card
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    res.json(card);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /:id
 * Cập nhật card (title, description, process, deadline) — member trở lên
 */
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

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Cần ít nhất member để sửa card
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

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

/**
 * DELETE /:id
 * Xóa card — member trở lên
 */
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

    const { column, role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Cần ít nhất member để xóa card
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    await card.deleteOne();

    const newCardOrderIds = column.cardOrderIds.filter(cardId => cardId.toString() !== id);
    await updateColumnCardOrder(column._id, newCardOrderIds, token);

    res.json({ message: ERROR_MESSAGES.CARD_DELETED });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /:id/image
 * Cập nhật ảnh card — member trở lên
 */
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

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Cần ít nhất member để upload ảnh
    if (!hasMinRole(role, 'member')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

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

/**
 * GET /board/:boardId
 * Lấy tất cả card theo board — chỉ lấy card trong các column user có quyền truy cập
 * (Column Service đã filter column theo role, nên chỉ trả về column user được phép thấy)
 */
const getCardsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const token = extractToken(req);

    if (!isValidObjectId(boardId)) {
      throwError(ERROR_MESSAGES.INVALID_BOARD_ID, STATUS_CODES.BAD_REQUEST);
    }

    await validateUserAndBoardAccess(boardId, req.user.id, token);

    // getColumnsByBoard đã filter theo memberIds bên Column Service
    const columns = await getColumnsByBoard(boardId, token);
    const columnIds = columns.map(column => column._id);

    const cards = await Card.find({ columnId: { $in: columnIds } }).select('title deadline process');
    res.json(cards);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /:id/comments
 * Thêm comment — viewer trở lên
 */
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

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Viewer trở lên được comment
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

    card.comments.push({ text });
    await card.save();

    res.status(STATUS_CODES.CREATED).json(card.comments[card.comments.length - 1]);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /:id/comments
 * Xem comment — viewer trở lên
 */
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

    const { role } = await getColumnAndRole(card.columnId, req.user.id, token);

    // Viewer trở lên được xem comment
    if (!hasMinRole(role, 'viewer')) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }

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