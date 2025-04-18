const Joi = require('joi');

const createColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
    'any.required': 'Tiêu đề là bắt buộc',
  }),
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'ID bảng phải có 24 ký tự',
    'string.hex': 'ID bảng phải là chuỗi hex',
    'any.required': 'ID bảng là bắt buộc',
  }),
  position: Joi.number().integer().min(0).required().messages({
    'number.base': 'Vị trí phải là một số',
    'number.min': 'Vị trí phải lớn hơn hoặc bằng 0',
    'any.required': 'Vị trí là bắt buộc',
  }),
  cardOrderIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Danh sách ID card phải là một mảng',
    'string.length': 'Mỗi ID card phải có 24 ký tự',
    'string.hex': 'ID card phải là chuỗi hex',
  }),
});

const updateColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Tiêu đề phải có ít nhất 3 ký tự',
    'string.max': 'Tiêu đề không được vượt quá 100 ký tự',
  }),
  position: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Vị trí phải là một số',
    'number.min': 'Vị trí phải lớn hơn hoặc bằng 0',
  }),
  cardOrderIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().length(24).hex()).optional().messages({
      'array.base': 'Danh sách ID thẻ phải là một mảng',
      'string.length': 'Mỗi ID thẻ phải có 24 ký tự',
      'string.hex': 'ID thẻ phải là chuỗi hex',
    }),
    Joi.object({
      $push: Joi.string().length(24).hex().required().messages({
        'string.length': 'ID thẻ phải có 24 ký tự',
        'string.hex': 'ID thẻ phải là chuỗi hex',
        'any.required': 'ID thẻ là bắt buộc',
      }),
    }).optional()
  ).optional(),

});

module.exports = { createColumnSchema, updateColumnSchema };