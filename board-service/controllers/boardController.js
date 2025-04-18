const jwt = require('jsonwebtoken');
const Board = require('../models/boardModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/userService');

// Middleware xác thực token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Không có token, từ chối quyền truy cập' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn thông tin người dùng từ token vào request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

const createBoard = async (req, res) => {
  const { title, description, memberIds, columnOrderIds } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const user = await checkUserExists(req.user.id, token); // Truyền token
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng trong Dịch vụ Người dùng' });
    }

    const board = new Board({
      title,
      description,
      userId: req.user.id,
      memberIds: memberIds || [],
      columnOrderIds: columnOrderIds || [], // Khởi tạo columnOrderIds
    });
    await board.save();

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getBoards = async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const user = await checkUserExists(req.user.id, token); // Truyền token
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng trong Dịch vụ Người dùng' });
    }

    const boards = await Board.find({
      $or: [{ userId: req.user.id }, { memberIds: req.user.id }],
    });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getBoardById = async (req, res) => {
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Không tìm thấy bảng' });
    }
    const isOwner = board.userId.toString() === req.user.id;
    const isMember = board.memberIds.map(id => id.toString()).includes(req.user.id);
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateBoard = async (req, res) => {
  const { title, description, memberIds, columnOrderIds } = req.body;
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Không tìm thấy bảng' });
    }

    if (board.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    // Cập nhật các trường nếu được cung cấp
    if (title) board.title = title;
    if (description) board.description = description;
    if (memberIds) board.memberIds = memberIds;
    
    // Xử lý cập nhật columnOrderIds
    if (columnOrderIds && columnOrderIds.$push) {
      // Thêm một columnId vào mảng columnOrderIds
      board.columnOrderIds.push(columnOrderIds.$push);
    } else if (Array.isArray(columnOrderIds)) {
      // Thay thế toàn bộ mảng columnOrderIds nếu được gửi dưới dạng mảng
      board.columnOrderIds = columnOrderIds;
    }

    board.updatedAt = Date.now();
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteBoard = async (req, res) => {
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Không tìm thấy bảng' });
    }

    if (board.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    await board.deleteOne();
    res.json({ message: 'Xóa bảng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const inviteUserToBoard = async (req, res) => {
  const { boardId, email } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Không tìm thấy bảng' });
    }
    if (board.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    const userResponse = await checkUserExistsByEmail(email, token);
    if (!userResponse) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng theo email' });
    }
    const invitedUserId = userResponse._id;
    if (board.memberIds.includes(invitedUserId)) {
      return res.status(400).json({ message: 'Người dùng đã là thành viên của bảng này' });
    }
    board.memberIds.push(invitedUserId);
    await board.save();
    res.status(200).json({ message: 'Mời người dùng thành công', board });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteUserToBoard,
  authMiddleware,
};