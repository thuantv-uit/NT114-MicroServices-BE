const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUser, getUserById } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const validate = require('../validation/validate');
const { registerSchema, loginSchema } = require('../validation/userValidation');

// Public routes với validation
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

// Protected routes
router.get('/me', authMiddleware, getUser);

// Thêm route mới: Lấy user theo ID
router.get('/:id', authMiddleware, getUserById);

module.exports = router;