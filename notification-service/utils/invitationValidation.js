const Joi = require('joi');

const inviteToBoardSchema = Joi.object({
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters',
    'string.hex': 'Board ID must be a hex string',
    'any.required': 'Board ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  role: Joi.string().valid('admin', 'member', 'viewer').required().messages({
    'string.valid': 'Role must be one of: admin, member, viewer',
    'any.required': 'Role is required',
  }),
});

const inviteToColumnSchema = Joi.object({
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters',
    'string.hex': 'Board ID must be a hex string',
    'any.required': 'Board ID is required',
  }),
  columnId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Column ID must be 24 characters',
    'string.hex': 'Column ID must be a hex string',
    'any.required': 'Column ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  role: Joi.string().valid('admin', 'member', 'viewer').required().messages({
    'string.valid': 'Role must be one of: admin, member, viewer',
    'any.required': 'Role is required',
  }),
});

module.exports = { inviteToBoardSchema, inviteToColumnSchema };