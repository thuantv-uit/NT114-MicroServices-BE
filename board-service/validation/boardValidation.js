const Joi = require('joi');

const createBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Member list must be an array',
    'string.length': 'Each member ID must be 24 characters long',
    'string.hex': 'Member ID must be a hex string',
  }),
  columnOrderIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Column ID list must be an array',
    'string.length': 'Each column ID must be 24 characters long',
    'string.hex': 'Column ID must be a hex string',
  }),
});

const updateBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 100 characters',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Member list must be an array',
    'string.length': 'Each member ID must be 24 characters long',
    'string.hex': 'Member ID must be a hex string',
  }),
  columnOrderIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().length(24).hex()).optional().messages({
      'array.base': 'Column ID list must be an array',
      'string.length': 'Each column ID must be 24 characters long',
      'string.hex': 'Column ID must be a hex string',
    }),
    Joi.object({
      $push: Joi.string().length(24).hex().required().messages({
        'string.length': 'Column ID must be 24 characters long',
        'string.hex': 'Column ID must be a hex string',
        'any.required': 'Column ID is required',
      }),
    }).optional()
  ).optional(),
});

const inviteUserSchema = Joi.object({
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters long',
    'string.hex': 'Board ID must be a hex string',
    'any.required': 'Board ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
});

module.exports = { createBoardSchema, updateBoardSchema, inviteUserSchema };
