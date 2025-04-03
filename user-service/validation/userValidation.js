const Joi = require('joi');

// Schema cho đăng ký người dùng
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    'string.base': 'Username phải là chuỗi',
    'string.min': 'Username phải có ít nhất 3 ký tự',
    'string.max': 'Username không được vượt quá 30 ký tự',
    'any.required': 'Username là bắt buộc',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu là bắt buộc',
  }),
});

// Schema cho đăng nhập
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Mật khẩu là bắt buộc',
  }),
});

module.exports = { registerSchema, loginSchema };