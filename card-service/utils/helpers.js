const mongoose = require('mongoose');

const extractToken = (req) => {
    return req.header('Authorization')?.replace('Bearer ', '');
  };
  
  const throwError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  };

  const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
  };
  
  module.exports = { extractToken, throwError, isValidObjectId };