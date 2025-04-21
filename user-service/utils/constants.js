const STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  };
  
  const ERROR_MESSAGES = {
    NO_TOKEN: 'No token provided, access denied',
    INVALID_TOKEN: 'Invalid token',
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User already exists',
    INVALID_CREDENTIALS: 'Invalid credentials',
    SERVER_ERROR: 'Server error',
  };
  
  module.exports = { STATUS_CODES, ERROR_MESSAGES };