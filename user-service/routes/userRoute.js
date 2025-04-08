const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
} = require('../controllers/userController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validation/userValidation');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/:id', getUserById);
router.get('/', getAllUsers);
router.post('/email', getUserByEmail);

module.exports = router;