const Card = require('../models/Card');
const { getListById } = require('../services/listService');
const { getBoardById } = require('../services/boardService');

// Tạo card mới
const createCard = async (req, res) => {
  const { title, description, listId, position } = req.body;
  const userId = req.user.id; // Lấy từ middleware auth
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    // Kiểm tra list
    const list = await getListById(listId, token);
    if (!list) {
      return res.status(404).json({ message: 'List không tồn tại' });
    }

    // Kiểm tra board
    const boardCheck = await getBoardById(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    const card = new Card({ title, description, listId, position });
    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy tất cả cards trong list
const getCardsByList = async (req, res) => {
  const { listId } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    // Kiểm tra list
    const list = await getListById(listId, token);
    if (!list) {
      return res.status(404).json({ message: 'List không tồn tại' });
    }

    // Kiểm tra board
    const boardCheck = await getBoardById(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    const cards = await Card.find({ listId }).sort({ position: 1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Cập nhật card
const updateCard = async (req, res) => {
  const { id } = req.params;
  const { title, description, position } = req.body;
  const userId = req.user.id;
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: 'Card không tồn tại' });
    }

    // Kiểm tra list
    const list = await getListById(card.listId, token);
    if (!list) {
      return res.status(404).json({ message: 'List không tồn tại' });
    }

    // Kiểm tra board
    const boardCheck = await getBoardById(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    card.title = title || card.title;
    card.description = description || card.description;
    card.position = position !== undefined ? position : card.position;
    card.updatedAt = Date.now();
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Xóa card
const deleteCard = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: 'Card không tồn tại' });
    }

    // Kiểm tra list
    const list = await getListById(card.listId, token);
    if (!list) {
      return res.status(404).json({ message: 'List không tồn tại' });
    }

    // Kiểm tra board
    const boardCheck = await getBoardById(list.boardId, userId, token);
    if (boardCheck.error) {
      return res.status(boardCheck.status).json({ message: boardCheck.error });
    }

    await card.remove();
    res.json({ message: 'Đã xóa card' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { createCard, getCardsByList, updateCard, deleteCard };