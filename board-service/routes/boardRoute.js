const express = require('express');
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteUserToBoard,
  authMiddleware,
} = require('../controllers/boardController');
const validate = require('../middleware/validate');
const { createBoardSchema, updateBoardSchema, inviteUserSchema } = require('../validation/boardValidation');

router.post('/', authMiddleware, validate(createBoardSchema), createBoard);
router.get('/list', authMiddleware, getBoards);
router.get('/:id', authMiddleware, getBoardById);
router.put('/:id', authMiddleware, validate(updateBoardSchema), updateBoard);
router.delete('/:id', authMiddleware, deleteBoard);
router.post('/invite', authMiddleware, validate(inviteUserSchema), inviteUserToBoard);

module.exports = router;