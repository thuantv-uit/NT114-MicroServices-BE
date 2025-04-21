const extractToken = (req) => {
    return req.header('Authorization')?.replace('Bearer ', '');
  };
  
  const throwError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    throw error;
  };
  
  module.exports = { extractToken, throwError };