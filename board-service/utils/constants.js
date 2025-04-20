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
    USER_NOT_FOUND: 'User not found in User Service',
    USER_NOT_FOUND_BY_EMAIL: 'User not found by email',
    USER_ALREADY_MEMBER: 'User is already a member of this board',
    USER_INVITED: 'User invited successfully',
    BOARD_NOT_FOUND: 'Board not found',
    UNAUTHORIZED: 'Unauthorized access',
    BOARD_DELETED: 'Board deleted successfully',
    SERVER_ERROR: 'Server error',
    INVALID_ID: 'Invalid ID',
    INVALID_BOARD_ID: 'Invalid board ID',
  };
  
  module.exports = { STATUS_CODES, ERROR_MESSAGES };
  