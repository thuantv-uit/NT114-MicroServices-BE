const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Board = require('../models/boardModel');
const { checkUserExists } = require('../services/user');
const { checkBoardInvitation } = require('../services/invitation');
const { extractToken, throwError, isValidObjectId } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
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

const validateUserAndBoardAccess = async (boardId, userId, token) => {
  const user = await checkUserExists(userId, token);
  if (!user) {
    throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  const board = await Board.findById(boardId);
  if (!board) {
    throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
  // Kiểm tra user là owner hoặc được mời vào board
  if (board.userId.toString() !== userId) {
    const boardInvitation = await checkBoardInvitation(boardId, userId, token);
    if (!boardInvitation || !boardInvitation.length) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_BOARD, STATUS_CODES.FORBIDDEN);
    }
  }
  return { user, board };
};

const createBoard = async (req, res, next) => {
  try {
    const { title, description, backgroundColor, backgroundImage } = req.body;
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = new Board({
      title,
      description,
      backgroundColor,
      backgroundImage,
      userId: req.user.id,
      memberIds: [], // Khởi tạo memberIds rỗng
    });
    await board.save();
    res.status(STATUS_CODES.CREATED).json(board);
  } catch (error) {
    next(error);
  }
};

const getBoards = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    // Lấy boards mà user là owner
    const ownedBoards = await Board.find({ userId: req.user.id });

    // Lấy boards mà user được mời vào
    const invitations = await checkBoardInvitation(null, req.user.id, token);
    const invitedBoardIds = invitations ? invitations.map(inv => inv.boardId.toString()) : [];

    // Lấy thông tin các board mà user được mời
    const invitedBoards = await Board.find({ _id: { $in: invitedBoardIds } });

    // Gộp danh sách boards (loại bỏ trùng lặp nếu có)
    const boards = [...ownedBoards];
    invitedBoards.forEach(board => {
      if (!boards.some(owned => owned._id.toString() === board._id.toString())) {
        boards.push(board);
      }
    });

    res.json(boards);
  } catch (error) {
    next(error);
  }
};

const getBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = await Board.findById(id);
    if (!board) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    // Kiểm tra user là owner hoặc được mời vào board
    if (board.userId.toString() !== req.user.id) {
      const boardInvitation = await checkBoardInvitation(id, req.user.id, token);
      if (!boardInvitation || !boardInvitation.length) {
        throwError(ERROR_MESSAGES.NOT_INVITED_TO_BOARD, STATUS_CODES.FORBIDDEN);
      }
    }
    res.json(board);
  } catch (error) {
    next(error);
  }
};

const allUserGetBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = await Board.findById(id);
    if (!board) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(board);
  } catch (error) {
    next(error);
  }
};

const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, backgroundColor, columnOrderIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }

    // Update fields
    board.title = title !== undefined ? title : board.title;
    board.description = description !== undefined ? description : board.description;
    if (backgroundColor !== undefined) {
      board.backgroundColor = backgroundColor;
      board.backgroundColorUpdatedAt = Date.now();
    }
    // Handle background image upload to Cloudinary
    if (req.file) {
      const result = await streamUpload(req.file.buffer, 'board_images');
      board.backgroundImage = result.secure_url;
      board.backgroundImageUpdatedAt = Date.now();
    }
    board.columnOrderIds = columnOrderIds !== undefined ? columnOrderIds : board.columnOrderIds;
    board.updatedAt = Date.now();

    await board.save();
    res.json(board);
  } catch (error) {
    next(error);
  }
};

// const updateBoard = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const { title, description, backgroundColor, columnOrderIds } = req.body;
//     const token = extractToken(req);
//     console.log('Request body:', req.body); // Thêm log để debug
//     if (!isValidObjectId(id)) {
//       throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
//     }
//     const { board } = await validateUserAndBoardAccess(id, req.user.id, token);
//     if (board.userId.toString() !== req.user.id) {
//       throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
//     }
//     let hasChanges = false;
//     if (title !== undefined && title !== board.title) {
//       board.title = title;
//       hasChanges = true;
//     }
//     if (description !== undefined && description !== board.description) {
//       board.description = description;
//       hasChanges = true;
//     }
//     if (backgroundColor !== undefined && backgroundColor !== board.backgroundColor) {
//       board.backgroundColor = backgroundColor;
//       board.backgroundColorUpdatedAt = Date.now();
//       hasChanges = true;
//     }
//     if (req.file) {
//       const result = await streamUpload(req.file.buffer, 'board_images');
//       board.backgroundImage = result.secure_url;
//       board.backgroundImageUpdatedAt = Date.now();
//       hasChanges = true;
//     }
//     if (columnOrderIds !== undefined && columnOrderIds !== board.columnOrderIds) {
//       board.columnOrderIds = columnOrderIds;
//       hasChanges = true;
//     }
//     if (hasChanges) {
//       board.updatedAt = Date.now();
//       await board.save();
//       console.log('Board updated successfully:', board);
//     } else {
//       console.log('No changes detected in request body');
//     }
//     res.json(board);
//   } catch (error) {
//     console.error('Error in updateBoard:', error);
//     next(error);
//   }
// };

const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const { board } = await validateUserAndBoardAccess(id, req.user.id, token);
    if (board.userId.toString() !== req.user.id) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    await board.deleteOne();
    res.json({ message: ERROR_MESSAGES.BOARD_DELETED });
  } catch (error) {
    next(error);
  }
};

const getLatestBoardId = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const latestBoard = await Board.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 }) // Sắp xếp theo createdAt giảm dần để lấy board mới nhất
      .select('_id'); // Chỉ lấy trường _id
    if (!latestBoard) {
      throwError(ERROR_MESSAGES.NO_BOARDS_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json({ boardId: latestBoard._id });
  } catch (error) {
    next(error);
  }
};

const updateBoardMemberIds = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const token = extractToken(req);
    if (!isValidObjectId(id)) {
      throwError(ERROR_MESSAGES.INVALID_ID, STATUS_CODES.BAD_REQUEST);
    }
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    const board = await Board.findById(id);
    if (!board) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    // Cập nhật memberIds
    board.memberIds = memberIds;
    board.updatedAt = Date.now();
    await board.save();
    res.json(board);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  createBoard,
  getBoards,
  getBoardById,
  allUserGetBoard,
  updateBoard,
  deleteBoard,
  getLatestBoardId,
  updateBoardMemberIds
};