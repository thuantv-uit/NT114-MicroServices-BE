const Joi = require('joi');

const createBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
    'any.required': 'Tiêu đề là bắt buộc',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Danh sách thành viên phải là một mảng',
    'string.length': 'Mỗi ID thành viên phải có 24 ký tự',
    'string.hex': 'ID thành viên phải là chuỗi hex',
  }),
  columnOrderIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Danh sách ID cột phải là một mảng',
    'string.length': 'Mỗi ID cột phải có 24 ký tự',
    'string.hex': 'ID cột phải là chuỗi hex',
  }),
});

const updateBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Danh sách thành viên phải là một mảng',
    'string.length': 'Mỗi ID thành viên phải có 24 ký tự',
    'string.hex': 'ID thành viên phải là chuỗi hex',
  }),
  columnOrderIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().length(24).hex()).optional().messages({
      'array.base': 'Danh sách ID cột phải là một mảng',
      'string.length': 'Mỗi ID cột phải có 24 ký tự',
      'string.hex': 'ID cột phải là chuỗi hex',
    }),
    Joi.object({
      $push: Joi.string().length(24).hex().required().messages({
        'string.length': 'ID cột phải có 24 ký tự',
        'string.hex': 'ID cột phải là chuỗi hex',
        'any.required': 'ID cột là bắt buộc',
      }),
    }).optional()
  ).optional(),
});

const inviteUserSchema = Joi.object({
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'ID bảng phải có 24 ký tự',
    'string.hex': 'ID bảng phải là chuỗi hex',
    'any.required': 'ID bảng là bắt buộc',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Định dạng email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
});

module.exports = { createBoardSchema, updateBoardSchema, inviteUserSchema };