const Joi = require('joi');

const createColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
  }),
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters',
    'string.hex': 'Board ID must be a hex string',
    'any.required': 'Board ID is required',
  }),
  position: Joi.number().integer().min(0).required().messages({
    'number.base': 'Position must be a number',
    'number.min': 'Position must be greater than or equal to 0',
    'any.required': 'Position is required',
  }),
  userId: Joi.string().length(24).hex().required().messages({
    'string.length': 'User ID must be 24 characters',
    'string.hex': 'User ID must be a hex string',
    'any.required': 'User ID is required',
  }),
});

const updateColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
  }),
  position: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Position must be a number',
    'number.min': 'Position must be greater than or equal to 0',
  }),
  userId: Joi.string().length(24).hex().required().messages({
    'string.length': 'User ID must be 24 characters',
    'string.hex': 'User ID must be a hex string',
    'any.required': 'User ID is required',
  }),
});

module.exports = { createColumnSchema, updateColumnSchema };