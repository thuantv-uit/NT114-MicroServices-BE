const jwt = require('jsonwebtoken');
const Column = require('../models/columnModel');
const { checkUserExists } = require('../services/user');
const { checkBoardAccess } = require('../services/board');

// Middleware xác thực token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn thông tin user từ token vào request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const createColumn = async (req, res) => {
  const { title, boardId, position } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = await checkBoardAccess(boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    const column = new Column({ title, boardId, position });
    await column.save();

    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getColumnsByBoard = async (req, res) => {
  const { boardId } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = await checkBoardAccess(boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    const columns = await Column.find({ boardId }).sort({ position: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getColumnById = async (req, res) => {
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    res.json(column);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateColumn = async (req, res) => {
  const { title, position } = req.body;
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    column.title = title || column.title;
    column.position = position !== undefined ? position : column.position;
    column.updatedAt = Date.now();
    await column.save();

    res.json(column);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteColumn = async (req, res) => {
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    await column.deleteOne();
    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createColumn, getColumnsByBoard, getColumnById, updateColumn, deleteColumn, authMiddleware };