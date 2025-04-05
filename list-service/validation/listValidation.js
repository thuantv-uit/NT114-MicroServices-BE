const Joi = require('joi');

const createListSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title phải có ít nhất 3 ký tự',
    'string.max': 'Title không được vượt quá 100 ký tự',
    'any.required': 'Title là bắt buộc',
  }),
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID phải có độ dài 24 ký tự',
    'string.hex': 'Board ID phải là chuỗi hex',
    'any.required': 'Board ID là bắt buộc',
  }),
  position: Joi.number().integer().min(0).required().messages({
    'number.base': 'Position phải là số',
    'number.min': 'Position phải lớn hơn hoặc bằng 0',
    'any.required': 'Position là bắt buộc',
  }),
});

const updateListSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title phải có ít nhất 3 ký tự',
    'string.max': 'Title không được vượt quá 100 ký tự',
  }),
  position: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Position phải là số',
    'number.min': 'Position phải lớn hơn hoặc bằng 0',
  }),
});

const idSchema = Joi.object({
  id: Joi.string().length(24).hex().required().messages({
    'string.length': 'ID phải có độ dài 24 ký tự',
    'string.hex': 'ID phải là chuỗi hex',
    'any.required': 'ID là bắt buộc',
  }),
});

module.exports = { createListSchema, updateListSchema, idSchema };