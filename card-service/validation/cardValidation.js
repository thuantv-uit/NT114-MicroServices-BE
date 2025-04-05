const Joi = require('joi');

const createCardSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  listId: Joi.string().length(24).hex().required(),
  position: Joi.number().integer().min(0).required(),
});

const updateCardSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  position: Joi.number().integer().min(0).optional(),
});

const idSchema = Joi.object({
  id: Joi.string().length(24).hex().required(),
});

module.exports = { createCardSchema, updateCardSchema, idSchema };