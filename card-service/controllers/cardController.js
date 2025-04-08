const Card = require('../models/cardModel');
const { getColumnById } = require('../services/column');
const { getBoardById } = require('../services/board');

const createCard = async (req, res) => {
  const { title, description, columnId, position, userId } = req.body;

  try {
    const column = await getColumnById(columnId, userId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const board = await getBoardById(column.boardId, userId);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    const card = new Card({ title, description, columnId, position });
    await card.save();

    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getCardsByColumn = async (req, res) => {
  const { columnId } = req.params;
  const { userId } = req.body;

  try {
    const column = await getColumnById(columnId, userId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const board = await getBoardById(column.boardId, userId);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    const cards = await Card.find({ columnId }).sort({ position: 1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateCard = async (req, res) => {
  const { id } = req.params;
  const { title, description, position, userId } = req.body;

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const column = await getColumnById(card.columnId, userId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const board = await getBoardById(column.boardId, userId);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    card.title = title || card.title;
    card.description = description || card.description;
    card.position = position !== undefined ? position : card.position;
    card.updatedAt = Date.now();
    await card.save();

    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteCard = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const column = await getColumnById(card.columnId, userId);
    if (!column) {
      return res.status(404).json({ message: 'Column not found' });
    }

    const board = await getBoardById(column.boardId, userId);
    if (!board) {
      return res.status(403).json({ message: 'Unauthorized or board not found' });
    }

    await card.deleteOne();
    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createCard, getCardsByColumn, updateCard, deleteCard };