const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
  authMiddleware,
} = require('../controllers/userController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { registerSchema, loginSchema } = require('../validation/userValidation');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/:id', authMiddleware, getUserById);
router.get('/', authMiddleware, getAllUsers);
router.post('/email', authMiddleware, getUserByEmail);

router.use(errorHandler);

module.exports = router;