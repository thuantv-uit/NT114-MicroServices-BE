const express = require('express');
const router = express.Router();
const {
  createColumn,
  getColumnsByBoard,
  getColumnById,
  updateColumn,
  deleteColumn,
} = require('../controllers/columnController');
const validate = require('../middleware/validate');
const { createColumnSchema, updateColumnSchema } = require('../validation/columnValidation');

router.post('/', validate(createColumnSchema), createColumn);
router.post('/board/:boardId', getColumnsByBoard);
router.get('/:id', getColumnById);
router.put('/:id', validate(updateColumnSchema), updateColumn);
router.delete('/:id', deleteColumn);

module.exports = router;