const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
  authMiddleware,
  changeAvatarHandler,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  deleteUser
} = require('../controllers/userController');
const validate = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const { registerSchema, loginSchema } = require('../validation/userValidation');
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password', verifyForgotPasswordOTP);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, getCurrentUser);
router.get('/:id', authMiddleware, getUserById);
router.get('/', authMiddleware, getAllUsers);
router.post('/email', authMiddleware, getUserByEmail);
router.post('/change-avatar', authMiddleware, upload.single('avatar'), changeAvatarHandler);
router.delete('/:id', authMiddleware, deleteUser);
router.use(errorHandler);

module.exports = router;