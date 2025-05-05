const Joi = require('joi');

const createCardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(500000).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  columnId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Column ID must be 24 characters',
    'string.hex': 'Column ID must be a hex string',
    'any.required': 'Column ID is required',
  }),
});

const updateCardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
});

module.exports = { createCardSchema, updateCardSchema };