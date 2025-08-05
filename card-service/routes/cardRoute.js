const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createCard,
  getCardsByColumn,
  updateCard,
  getCardById,
  deleteCard,
  authMiddleware,
  updateCardImage,
  getCardsByBoard,
} = require('../controllers/cardController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { createCardSchema, updateCardSchema } = require('../validation/cardValidation');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(authMiddleware);

router.post('/', validate(createCardSchema), createCard);
router.get('/board/:boardId', getCardsByBoard);
router.get('/column/:columnId', getCardsByColumn);
router.get('/:id', getCardById);
router.put('/:id', validate(updateCardSchema), updateCard);
router.delete('/:id', deleteCard);
router.post('/:id/image', upload.single('image'), updateCardImage);
router.use(errorHandler);

module.exports = router;