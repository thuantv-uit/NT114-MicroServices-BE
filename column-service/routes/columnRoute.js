const express = require('express');
const router = express.Router();
const {
  authMiddleware,
  createColumn,
  updateColumn,
  deleteColumn,
  getColumnsByBoard,
  getColumnById,
  getColumnByIdForAll,
  updateColumnMemberIds
} = require('../controllers/columnController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { createColumnSchema, updateColumnSchema, updateColumnMemberIdsSchema } = require('../validation/columnValidation');

router.use(authMiddleware);

router.post('/', validate(createColumnSchema), createColumn);
router.put('/:columnId', validate(updateColumnSchema), updateColumn);
router.put('/:columnId/memberIds', validate(updateColumnMemberIdsSchema), updateColumnMemberIds);
router.delete('/:columnId', deleteColumn);
router.get('/board/:boardId', getColumnsByBoard);
router.get('/:columnId', getColumnById);
router.get('/all/:columnId', getColumnByIdForAll);

router.use(errorHandler);

module.exports = router;