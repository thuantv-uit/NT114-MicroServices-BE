const express = require('express');
const router = express.Router();
const {
  createCard,
  getCardsByColumn,
  updateCard,
  deleteCard,
  authMiddleware,
} = require('../controllers/cardController');
const validate = require('../middleware/validate');
const { createCardSchema, updateCardSchema } = require('../validation/cardValidation');

router.post('/', authMiddleware, validate(createCardSchema), createCard);
router.get('/column/:columnId', authMiddleware, getCardsByColumn);
router.put('/:id', authMiddleware, validate(updateCardSchema), updateCard);
router.delete('/:id', authMiddleware, deleteCard);

module.exports = router;