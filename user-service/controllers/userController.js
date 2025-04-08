const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ username, email, password });
    await user.save();

    res.status(201).json({
      user: { id: user._id, username, email },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token hết hạn sau 1 giờ
    );

    res.json({
      user: { id: user._id, username: user.username, email },
      token, // Trả về token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware để xác thực token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn thông tin user từ token vào request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserByEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  getUserById,
  getAllUsers,
  getUserByEmail,
  authMiddleware,
};