const Joi = require('joi');

const createCardSchema = Joi.object({
  title: Joi.string().min(3).max(1000).required().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
    'any.required': 'Tiêu đề là bắt buộc',
  }),
  description: Joi.string().max(10000).optional().messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự',
  }),
  columnId: Joi.string().length(24).hex().required().messages({
    'string.length': 'ID cột phải có 24 ký tự',
    'string.hex': 'ID cột phải là chuỗi hex',
    'any.required': 'ID cột là bắt buộc',
  }),
  process: Joi.number().min(0).max(100).default(0).messages({
    'number.base': 'Mức độ hoàn thành phải là một số',
    'number.min': 'Mức độ hoàn thành phải từ 0 trở lên',
    'number.max': 'Mức độ hoàn thành không được vượt quá 100',
  }),
  deadline: Joi.date().optional().messages({
    'date.base': 'Deadline phải là một ngày hợp lệ',
  }),
});

const updateCardSchema = Joi.object({
  title: Joi.string().min(3).max(1000).optional().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
  }),
  description: Joi.string().max(10000).optional().messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự',
  }),
  process: Joi.number().min(0).max(100).optional().messages({
    'number.base': 'Mức độ hoàn thành phải là một số',
    'number.min': 'Mức độ hoàn thành phải từ 0 trở lên',
    'number.max': 'Mức độ hoàn thành không được vượt quá 100',
  }),
  deadline: Joi.date().optional().messages({
    'date.base': 'Deadline phải là một ngày hợp lệ',
  }),
});

module.exports = { createCardSchema, updateCardSchema };