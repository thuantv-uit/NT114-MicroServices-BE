const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { throwError, extractToken } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');
const { streamUpload } = require('../config/CloudinaryProvider');
const { generateOTP, generateOTPExpiry, sendOTPEmail } = require('../service/Otpservice');

// ─────────────────────────────────────────────
// REGISTER — create user with active: false, send OTP
// ─────────────────────────────────────────────
const registerUser = async (req, res, next) => {
  try {
    const { username, email, password, avatar } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throwError(ERROR_MESSAGES.USER_ALREADY_EXISTS, STATUS_CODES.BAD_REQUEST);
    }

    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    const user = new User({
      username,
      email,
      password,
      avatar,
      active: false,
      otp,
      otpExpiry
    });

    await user.save();
    await sendOTPEmail(email, otp);

    res.status(STATUS_CODES.CREATED).json({
      message: 'Registration successful. Please check your email for the OTP verification code.',
      user: { id: user._id, username, email, avatar: user.avatar }
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// VERIFY OTP — set active: true if OTP is valid
// ─────────────────────────────────────────────
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    if (user.active) {
      return res.json({ message: 'Account has already been verified.' });
    }

    if (!user.otp || !user.otpExpiry) {
      throwError('No OTP found. Please request a new one.', STATUS_CODES.BAD_REQUEST);
    }

    if (new Date() > user.otpExpiry) {
      throwError('OTP has expired. Please request a new one.', STATUS_CODES.BAD_REQUEST);
    }

    if (user.otp !== otp) {
      throwError('Invalid OTP.', STATUS_CODES.BAD_REQUEST);
    }

    // OTP valid — activate account and clear OTP
    user.active = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Account verified successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// RESEND OTP — when OTP expired or not received
// ─────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    if (user.active) {
      return res.json({ message: 'Account is already verified. No need to resend OTP.' });
    }

    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// LOGIN — block if active: false
// ─────────────────────────────────────────────
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      throwError(ERROR_MESSAGES.INVALID_CREDENTIALS, STATUS_CODES.BAD_REQUEST);
    }

    if (!user.active) {
      throwError(
        'Account is not verified. Please check your email and enter the OTP.',
        STATUS_CODES.FORBIDDEN
      );
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      user: { id: user._id, username: user.username, email },
      token
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// FORGOT PASSWORD — send OTP to email
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    if (!user.active) {
      throwError(
        'Account is not verified. Please verify your account first.',
        STATUS_CODES.FORBIDDEN
      );
    }

    const otp = generateOTP();
    const otpExpiry = generateOTPExpiry();

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: 'A password reset OTP has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// VERIFY FORGOT PASSWORD OTP — validate OTP only
// ─────────────────────────────────────────────
const verifyForgotPasswordOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    if (!user.otp || !user.otpExpiry) {
      throwError('No OTP found. Please request a new one.', STATUS_CODES.BAD_REQUEST);
    }

    if (new Date() > user.otpExpiry) {
      throwError('OTP has expired. Please request a new one.', STATUS_CODES.BAD_REQUEST);
    }

    if (user.otp !== otp) {
      throwError('Invalid OTP.', STATUS_CODES.BAD_REQUEST);
    }

    // OTP valid — clear it so reset-password step can proceed
    // We keep otpExpiry as a short-lived "reset session" marker
    user.otp = undefined;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min window to submit new password
    await user.save();

    res.json({ message: 'OTP verified. You may now reset your password.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// RESET PASSWORD — set new password after OTP verified
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    // Check reset window is still valid (otpExpiry reused as reset session)
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throwError(
        'Reset session has expired. Please start the forgot password process again.',
        STATUS_CODES.BAD_REQUEST
      );
    }

    user.password = newPassword;
    user.otpExpiry = undefined;
    await user.save(); // pre-save hook will hash the new password

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// REMAINING HANDLERS — unchanged
// ─────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throwError(ERROR_MESSAGES.NO_TOKEN, STATUS_CODES.UNAUTHORIZED);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    throwError(ERROR_MESSAGES.INVALID_TOKEN, STATUS_CODES.UNAUTHORIZED);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const changeAvatarHandler = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throwError(ERROR_MESSAGES.NO_TOKEN, STATUS_CODES.UNAUTHORIZED);
    }
    if (!req.file) {
      throwError('No file uploaded.', STATUS_CODES.BAD_REQUEST);
    }

    const userId = req.user.id;
    const fileBuffer = req.file.buffer;

    const result = await streamUpload(fileBuffer, 'avatars');

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: result.secure_url },
      { new: true, select: 'username email avatar' }
    );

    if (!updatedUser) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    res.status(STATUS_CODES.OK).json({
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};


// ─────────────────────────────────────────────
// DELETE USER — xoá account của chính mình
// ─────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throwError(ERROR_MESSAGES.NO_TOKEN, STATUS_CODES.UNAUTHORIZED);
    }

    // Chỉ cho phép xoá chính mình, trừ khi là admin
    const targetId = req.params.id;
    if (targetId !== req.user.id) {
      throwError(ERROR_MESSAGES.FORBIDDEN || 'You are not allowed to delete this account.', STATUS_CODES.FORBIDDEN);
    }

    const user = await User.findByIdAndDelete(targetId);
    if (!user) {
      throwError(ERROR_MESSAGES.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }

    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
  authMiddleware,
  changeAvatarHandler,
  deleteUser
};