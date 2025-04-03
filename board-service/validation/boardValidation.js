const Joi = require('joi');

const createBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title phải có ít nhất 3 ký tự',
    'string.max': 'Title không được vượt quá 100 ký tự',
    'any.required': 'Title là bắt buộc',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description không được vượt quá 500 ký tự',
  }),
});

const updateBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title phải có ít nhất 3 ký tự',
    'string.max': 'Title không được vượt quá 100 ký tự',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description không được vượt quá 500 ký tự',
  }),
});

const idSchema = Joi.object({
  id: Joi.string().length(24).hex().required().messages({
    'string.length': 'ID phải có độ dài 24 ký tự',
    'string.hex': 'ID phải là chuỗi hex',
    'any.required': 'ID là bắt buộc',
  }),
});

module.exports = { createBoardSchema, updateBoardSchema, idSchema };