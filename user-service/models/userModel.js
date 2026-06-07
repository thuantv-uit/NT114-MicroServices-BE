const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true,
    // Chỉ bắt buộc với local user
    required: function () { return this.authType === 'local'; }
  },
  email:    { type: String, required: true, unique: true },
  password: {
    type: String,
    // Chỉ bắt buộc với local user
    required: function () { return this.authType === 'local'; }
  },
  avatar:    { type: String, default: '' },
  active:    { type: Boolean, default: false },
  googleId:  { type: String, sparse: true },
  authType:  {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  otp:       { type: String },
  otpExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Chỉ hash password nếu là local user và password có thay đổi
userSchema.pre('save', async function (next) {
  if (this.authType !== 'local') return next();
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  if (this.authType !== 'local') {
    throw new Error('This account logs in using Google. Please use the "Sign in with Google" button.');
  }
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);