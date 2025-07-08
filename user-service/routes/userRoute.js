const express = require('express');
const multer = require('multer')
const router = express.Router();
const {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
  authMiddleware,
  changeAvatarHandler
} = require('../controllers/userController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { registerSchema, loginSchema } = require('../validation/userValidation');
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/:id', authMiddleware, getUserById);
router.get('/', authMiddleware, getAllUsers);
router.post('/email', authMiddleware, getUserByEmail);
router.post('/change-avatar', authMiddleware, upload.single('avatar'), changeAvatarHandler)

router.use(errorHandler);

module.exports = router;