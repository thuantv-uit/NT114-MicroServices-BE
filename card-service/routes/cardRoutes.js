const express = require('express');
const router = express.Router();
const { createCard, getCardsByList, updateCard, deleteCard } = require('../controllers/cardController');
const authMiddleware = require('../middleware/auth');
const validate = require('../validation/validate');
const { createCardSchema, updateCardSchema, idSchema } = require('../validation/cardValidation');

router.post('/', validate(createCardSchema), authMiddleware, createCard);
router.get('/list/:listId', authMiddleware, getCardsByList);
router.put('/:id', validate(updateCardSchema), authMiddleware, updateCard);
router.delete('/:id', validate(idSchema), authMiddleware, deleteCard);

module.exports = router;