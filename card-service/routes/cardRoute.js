const express = require('express');
const router = express.Router();
const {
  createCard,
  getCardsByColumn,
  updateCard,
  deleteCard,
} = require('../controllers/cardController');
const validate = require('../middleware/validate');
const { createCardSchema, updateCardSchema } = require('../validation/cardValidation');

router.post('/', validate(createCardSchema), createCard);
router.post('/column/:columnId', getCardsByColumn);
router.put('/:id', validate(updateCardSchema), updateCard);
router.delete('/:id', deleteCard);

module.exports = router;