const Joi = require('joi');

const createBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  userId: Joi.string().length(24).hex().required().messages({
    'string.length': 'User ID must be 24 characters',
    'string.hex': 'User ID must be a hex string',
    'any.required': 'User ID is required',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'MemberIds must be an array',
    'string.length': 'Each memberId must be 24 characters',
    'string.hex': 'MemberId must be a hex string',
  }),
});

const updateBoardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional().messages({
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 100 characters',
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  userId: Joi.string().length(24).hex().required().messages({
    'string.length': 'User ID must be 24 characters',
    'string.hex': 'User ID must be a hex string',
    'any.required': 'User ID is required',
  }),
  memberIds: Joi.array().items(Joi.string().length(24).hex()).optional().messages({
    'array.base': 'MemberIds must be an array',
    'string.length': 'Each memberId must be 24 characters',
    'string.hex': 'MemberId must be a hex string',
  }),
});

const inviteUserSchema = Joi.object({
  boardId: Joi.string().length(24).hex().required().messages({
    'string.length': 'Board ID must be 24 characters',
    'string.hex': 'Board ID must be a hex string',
    'any.required': 'Board ID is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  userId: Joi.string().length(24).hex().required().messages({
    'string.length': 'User ID must be 24 characters',
    'string.hex': 'User ID must be a hex string',
    'any.required': 'User ID is required',
  }),
});

module.exports = { createBoardSchema, updateBoardSchema, inviteUserSchema };