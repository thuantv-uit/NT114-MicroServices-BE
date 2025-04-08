const express = require('express');
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  inviteUserToBoard,
} = require('../controllers/boardController');
const validate = require('../middleware/validate');
const { createBoardSchema, updateBoardSchema, inviteUserSchema } = require('../validation/boardValidation');

router.post('/', validate(createBoardSchema), createBoard);
router.post('/list', getBoards);
router.get('/:id', getBoardById);
router.put('/:id', validate(updateBoardSchema), updateBoard);
router.delete('/:id', deleteBoard);
router.post('/invite', validate(inviteUserSchema), inviteUserToBoard);

module.exports = router;