const express = require('express');
const router = express.Router();
const {
  authMiddleware,
  createColumn,
  updateColumn,
  deleteColumn,
  getColumnsByBoard,
  getColumnById,
  getColumnByIdForAll
} = require('../controllers/columnController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { createColumnSchema, updateColumnSchema } = require('../validation/columnValidation');

router.use(authMiddleware);

router.post('/', validate(createColumnSchema), createColumn);
router.put('/:columnId', validate(updateColumnSchema), updateColumn);
router.delete('/:columnId', deleteColumn);
router.get('/board/:boardId', getColumnsByBoard);
router.get('/:columnId', getColumnById);
router.get('/all/:columnId', getColumnByIdForAll);

router.use(errorHandler);

module.exports = router;