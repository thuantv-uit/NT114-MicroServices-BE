const express = require('express');
const router = express.Router();
const {
  createColumn,
  getColumnsByBoard,
  getColumnById,
  updateColumn,
  deleteColumn,
  authMiddleware,
} = require('../controllers/columnController');
const validate = require('../middleware/validate');
const { createColumnSchema, updateColumnSchema } = require('../validation/columnValidation');

router.post('/', authMiddleware, validate(createColumnSchema), createColumn);
router.get('/board/:boardId', authMiddleware, getColumnsByBoard);
router.get('/:id', authMiddleware, getColumnById);
router.put('/:id', authMiddleware, validate(updateColumnSchema), updateColumn);
router.delete('/:id', authMiddleware, deleteColumn);

module.exports = router;