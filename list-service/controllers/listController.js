const List = require('../models/List');
const { checkUserExists } = require('../services/userService');
const { checkBoardAccess } = require('../services/boardService');
require('dotenv').config();

// Tạo list mới trong board
const createList = async (req, res) => {
  const { title, boardId, position } = req.body;
  const userId = req.user.id; // Lấy từ token qua authMiddleware
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token an toàn

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra board có tồn tại và user có quyền truy cập
    const boardCheck = await checkBoardAccess(boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    const list = new List({ title, boardId, position });
    await list.save();
    res.status(201).json(list);
  } catch (error) {
    console.error('Create List Error:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy tất cả lists trong board
const getListsByBoard = async (req, res) => {
  const { boardId } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token an toàn

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra board có tồn tại và user có quyền truy cập
    const boardCheck = await checkBoardAccess(boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    const lists = await List.find({ boardId }).sort({ position: 1 });
    res.json(lists);
  } catch (error) {
    console.error('Get Lists Error:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy list theo ID
const getListById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Tìm list theo ID
    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List không tồn tại' });

    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra quyền truy cập vào board chứa list
    const boardCheck = await checkBoardAccess(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    res.json(list);
  } catch (error) {
    console.error('Get List By ID Error:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Cập nhật list
const updateList = async (req, res) => {
  const { title, position } = req.body;
  const { id } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token an toàn

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List không tồn tại' });

    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra board có tồn tại và user có quyền truy cập
    const boardCheck = await checkBoardAccess(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    list.title = title || list.title;
    list.position = position !== undefined ? position : list.position;
    list.updatedAt = Date.now();
    await list.save();
    res.json(list);
  } catch (error) {
    console.error('Update List Error:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Xóa list
const deleteList = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token an toàn

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List không tồn tại' });

    // Kiểm tra user có tồn tại
    const user = await checkUserExists(userId, token);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    // Kiểm tra board có tồn tại và user có quyền truy cập
    const boardCheck = await checkBoardAccess(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    await list.remove();
    res.json({ message: 'List đã được xóa' });
  } catch (error) {
    console.error('Delete List Error:', error.message);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createList, getListsByBoard, updateList, deleteList, getListById };