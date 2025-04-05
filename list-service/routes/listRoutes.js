const express = require('express');
const router = express.Router();
const {
  createList,
  getListsByBoard,
  updateList,
  deleteList,
  getListById
} = require('../controllers/listController');
const authMiddleware = require('../middleware/auth');
const validate = require('../validation/validate');
const { createListSchema, updateListSchema, idSchema } = require('../validation/listValidation');

// Protected routes
router.post('/', validate(createListSchema), authMiddleware, createList);
router.get('/board/:boardId', authMiddleware, getListsByBoard);
router.get('/:id', authMiddleware, getListById);
router.put('/:id', validate(updateListSchema), authMiddleware, updateList);
router.delete('/:id', validate(idSchema), authMiddleware, deleteList);

module.exports = router;