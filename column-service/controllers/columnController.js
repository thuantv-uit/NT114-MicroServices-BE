const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Column = require('../models/columnModel');
const { checkUserExists } = require('../services/user');
const { checkBoardAccess, updateBoardColumnOrder } = require('../services/board');

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

const createColumn = async (req, res) => {
  const { title, boardId, position, cardOrderIds } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const board = await checkBoardAccess(boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Không có quyền hoặc bảng không tồn tại' });
    }

    const column = new Column({
      title,
      boardId,
      position,
      cardOrderIds: cardOrderIds || [],
    });
    await column.save();

    // Kiểm tra _id
    if (!mongoose.Types.ObjectId.isValid(column._id)) {
      throw new Error('ID cột không hợp lệ');
    }

    // Thêm _id của cột vào mảng columnOrderIds của bảng
    await updateBoardColumnOrder(boardId, column._id, token);

    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getColumnsByBoard = async (req, res) => {
  const { boardId } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const board = await checkBoardAccess(boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Không có quyền hoặc bảng không tồn tại' });
    }

    const columns = await Column.find({ boardId }).sort({ position: 1 });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getColumnById = async (req, res) => {
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Không tìm thấy cột' });
    }

    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Không có quyền hoặc bảng không tồn tại' });
    }

    res.json(column);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateColumn = async (req, res) => {
  const { title, position, cardOrderIds } = req.body;
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    console.log(`Updating column ${id} with body:`, req.body); // Log body

    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Không tìm thấy cột' });
    }

    console.log('Checking user...');
    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    console.log('Checking board access...');
    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Không có quyền hoặc bảng không tồn tại' });
    }

    column.title = title || column.title;
    column.position = position !== undefined ? position : column.position;
    
    // Xử lý cardOrderIds
    if (cardOrderIds && cardOrderIds.$push) {
      console.log(`Pushing card ID ${cardOrderIds.$push} to cardOrderIds`);
      if (!mongoose.Types.ObjectId.isValid(cardOrderIds.$push)) {
        return res.status(400).json({ message: 'ID thẻ không hợp lệ' });
      }
      column.cardOrderIds.push(cardOrderIds.$push);
    } else if (Array.isArray(cardOrderIds)) {
      console.log('Replacing cardOrderIds with:', cardOrderIds);
      column.cardOrderIds = cardOrderIds;
    }

    console.log('Saving column...');
    await column.save();

    res.json(column);
  } catch (error) {
    console.error('Error in updateColumn:', error); // Log lỗi chi tiết
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteColumn = async (req, res) => {
  const { id } = req.params;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const column = await Column.findById(id);
    if (!column) {
      return res.status(404).json({ message: 'Không tìm thấy cột' });
    }

    const user = await checkUserExists(req.user.id, token);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const board = await checkBoardAccess(column.boardId, req.user.id, token);
    if (!board) {
      return res.status(403).json({ message: 'Không có quyền hoặc bảng không tồn tại' });
    }

    await column.deleteOne();
    res.json({ message: 'Xóa cột thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createColumn, getColumnsByBoard, getColumnById, updateColumn, deleteColumn, authMiddleware };