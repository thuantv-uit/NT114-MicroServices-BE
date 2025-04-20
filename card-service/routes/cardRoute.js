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
const errorHandler = require('../middleware/errorHandler');
const { createCardSchema, updateCardSchema } = require('../validation/cardValidation');

router.use(authMiddleware);

router.post('/', validate(createCardSchema), createCard);
router.get('/column/:columnId', getCardsByColumn);
router.put('/:id', validate(updateCardSchema), updateCard);
router.delete('/:id', deleteCard);

router.use(errorHandler);

module.exports = router;