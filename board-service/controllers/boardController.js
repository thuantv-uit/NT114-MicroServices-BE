const Board = require('../models/Board');
const { checkUserExists } = require('../services/userService');

// Hàm tạo board
const createBoard = async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id; // Lấy từ token qua authMiddleware
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    // Kiểm tra user có tồn tại trong User Service
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    // Tạo board nếu user tồn tại
    const board = new Board({ title, description, userId });
    await board.save();
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hàm lấy danh sách boards
const getBoards = async (req, res) => {
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    const boards = await Board.find({ userId });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hàm lấy board theo ID
const getBoardById = async (req, res) => {
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Kiểm tra quyền truy cập
    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hàm cập nhật board
const updateBoard = async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Kiểm tra quyền truy cập
    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    board.title = title || board.title;
    board.description = description || board.description;
    board.updatedAt = Date.now();
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Hàm xóa board
const deleteBoard = async (req, res) => {
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Kiểm tra quyền truy cập
    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await board.remove();
    res.json({ message: 'Board deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
};