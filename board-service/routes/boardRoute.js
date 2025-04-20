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
const errorHandler = require('../middleware/errorHandler');
const { createBoardSchema, updateBoardSchema, inviteUserSchema } = require('../validation/boardValidation');

router.use(authMiddleware);

router.post('/', validate(createBoardSchema), createBoard);
router.get('/list', getBoards);
router.get('/:id', getBoardById);
router.put('/:id', validate(updateBoardSchema), updateBoard);
router.delete('/:id', deleteBoard);
router.post('/invite', validate(inviteUserSchema), inviteUserToBoard);

router.use(errorHandler);

module.exports = router;