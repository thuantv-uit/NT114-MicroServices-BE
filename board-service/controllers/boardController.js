const jwt = require('jsonwebtoken');
const Board = require('../models/boardModel');
const { checkUserExists, checkUserExistsByEmail } = require('../services/userService');

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

const createBoard = async (req, res) => {
  const { title, description, memberIds } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const user = await checkUserExists(req.user.id, token); // Truyền token
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    const board = new Board({
      title,
      description,
      userId: req.user.id,
      memberIds: memberIds || [],
    });
    await board.save();

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBoards = async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

  try {
    const user = await checkUserExists(req.user.id, token); // Truyền token
    if (!user) {
      return res.status(404).json({ message: 'User not found in User Service' });
    }

    const boards = await Board.find({
      $or: [{ userId: req.user.id }, { memberIds: req.user.id }],
    });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// const getBoardById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const board = await Board.findById(id);
//     if (!board) {
//       return res.status(404).json({ message: 'Board not found' });
//     }

//     if (board.userId.toString() !== req.user.id && !board.memberIds.includes(req.user.id)) {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     res.json(board);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

const getBoardById = async (req, res) => {
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const isOwner = board.userId.toString() === req.user.id;
    const isMember = board.memberIds.map(id => id.toString()).includes(req.user.id);
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateBoard = async (req, res) => {
  const { title, description, memberIds } = req.body;
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== req.user.id) {
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
  const { id } = req.params;

  try {
    const board = await Board.findById(id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (board.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await board.deleteOne();
    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// const inviteUserToBoard = async (req, res) => {
//   const { boardId, email } = req.body;
//   const token = req.header('Authorization')?.replace('Bearer ', ''); // Lấy token từ header

//   try {
//     const board = await Board.findById(boardId);
//     if (!board) {
//       return res.status(404).json({ message: 'Board not found' });
//     }

//     if (board.userId.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Unauthorized' });
//     }

//     const userResponse = await checkUserExistsByEmail(email, token); // Truyền token
//     if (!userResponse) {
//       return res.status(404).json({ message: 'User not found by email' });
//     }

//     const invitedUserId = userResponse._id;
//     if (board.memberIds.includes(invitedUserId)) {
//       return res.status(400).json({ message: 'User is already a member of this board' });
//     }

//     board.memberIds.push(invitedUserId);
//     await board.save();

//     res.status(200).json({ message: 'User invited successfully', board });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

const inviteUserToBoard = async (req, res) => {
  const { boardId, email } = req.body;
  const token = req.header('Authorization')?.replace('Bearer ', '');

  try {
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    if (board.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const userResponse = await checkUserExistsByEmail(email, token);
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
  authMiddleware,
};