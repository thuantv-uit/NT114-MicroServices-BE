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
const errorHandler = require('../middleware/errorHandler');
const { createColumnSchema, updateColumnSchema } = require('../validation/columnValidation');

router.use(authMiddleware);

router.post('/', validate(createColumnSchema), createColumn);
router.get('/board/:boardId', getColumnsByBoard);
router.get('/:id', getColumnById);
router.put('/:id', validate(updateColumnSchema), updateColumn);
router.delete('/:id', deleteColumn);

router.use(errorHandler);

module.exports = router;