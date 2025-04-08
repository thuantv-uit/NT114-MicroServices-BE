const Board = require('../models/boardModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/userService');

const createBoard = async (req, res) => {
  const { title, description, userId, memberIds } = req.body;

  try {
    const user = await checkUserExists(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    const board = new Board({
      title,
      description,
      userId,
      memberIds: memberIds || [],
    });
    await board.save();

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBoards = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await checkUserExists(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    const boards = await Board.find({
      $or: [{ userId }, { memberIds: userId }],
    });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBoardById = async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== userId && !board.memberIds.includes(userId)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateBoard = async (req, res) => {
  const { title, description, memberIds, userId } = req.body;
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    board.title = title || board.title;
    board.description = description || board.description;
    board.memberIds = memberIds || board.memberIds;
    board.updatedAt = Date.now();
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteBoard = async (req, res) => {
  const { userId } = req.body;
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await board.deleteOne();
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const inviteUserToBoard = async (req, res) => {
  const { boardId, email, userId } = req.body;

  try {
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const userResponse = await checkUserExistsByEmail(email);
    if (!userResponse) {
      return res.status(404).json({ message: 'User not found by email' });
    }

    const invitedUserId = userResponse._id;
    if (board.memberIds.includes(invitedUserId)) {
      return res.status(400).json({ message: 'User is already a member of this board' });
    }

    board.memberIds.push(invitedUserId);
    await board.save();

    res.status(200).json({ message: 'User invited successfully', board });
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
  inviteUserToBoard,
};