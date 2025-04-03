const express = require('express');
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
} = require('../controllers/boardController');
const authMiddleware = require('../middleware/auth');
const validate = require('../validation/validate');
const { createBoardSchema, updateBoardSchema, idSchema } = require('../validation/boardValidation');

// Protected routes
router.post('/', validate(createBoardSchema), authMiddleware, createBoard);
router.get('/', authMiddleware, getBoards);
router.get('/:id', validate(idSchema), authMiddleware, getBoardById);
router.put('/:id', validate(updateBoardSchema), authMiddleware, updateBoard);
router.delete('/:id', validate(idSchema), authMiddleware, deleteBoard);

module.exports = router;