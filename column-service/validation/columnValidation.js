const Joi = require('joi');

const createColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
  }),
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters long',
    'string.hex': 'Board ID must be a hexadecimal string',
    'any.required': 'Board ID is required',
  }),
  cardOrderIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'Card ID list must be an array',
    'string.length': 'Each card ID must be 24 characters long',
    'string.hex': 'Card ID must be a hexadecimal string',
  }),
  memberIds: Joi.array().items(
    Joi.object({
      userId: Joi.string().length(24).hex().required().messages({
        'string.length': 'Each member ID must be 24 characters long',
        'string.hex': 'Member ID must be a hex string',
        'any.required': 'Member ID is required',
      }),
      role: Joi.string().valid('admin', 'member', 'viewer').required().messages({
        'string.valid': 'Role must be one of: admin, member, viewer',
        'any.required': 'Role is required',
      }),
    })
  ).optional().default([]).messages({
    'array.base': 'Member list must be an array',
  }),
});

const updateColumnSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title must not exceed 100 characters',
  }),
  backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
      'string.pattern.base': 'Background color must be a valid hex color code (e.g., #FFFFFF)',
    }),
  cardOrderIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().length(24).hex()).optional().messages({
      'array.base': 'Card ID list must be an array',
      'string.length': 'Each card ID must be 24 characters long',
      'string.hex': 'Card ID must be a hexadecimal string',
    }),
    Joi.object({
      $push: Joi.string().length(24).hex().required().messages({
        'string.length': 'Card ID must be 24 characters long',
        'string.hex': 'Card ID must be a hexadecimal string',
        'any.required': 'Card ID is required',
      }),
    }).optional()
  ).optional(),
});

const updateColumnMemberIdsSchema = Joi.object({
  memberIds: Joi.array().items(
    Joi.object({
      userId: Joi.string().length(24).hex().required().messages({
        'string.length': 'Each member ID must be 24 characters long',
        'string.hex': 'Member ID must be a hex string',
        'any.required': 'Member ID is required',
      }),
      role: Joi.string().valid('admin', 'member', 'viewer').required().messages({
        'string.valid': 'Role must be one of: admin, member, viewer',
        'any.required': 'Role is required',
      }),
    })
  ).required().messages({
    'array.base': 'Member list must be an array',
    'any.required': 'Member list is required',
  }),
});

module.exports = { createColumnSchema, updateColumnSchema, updateColumnMemberIdsSchema };