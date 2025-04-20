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
    NO_TOKEN: 'No token, authorization denied',
    INVALID_TOKEN: 'Token is not valid',
    COLUMN_NOT_FOUND: 'Column not found',
    CARD_NOT_FOUND: 'Card not found',
    UNAUTHORIZED_OR_BOARD_NOT_FOUND: 'Unauthorized or board not found',
    CARD_DELETED: 'Card deleted successfully',
    COLUMN_SERVICE_ERROR: 'Error communicating with Column Service',
    BOARD_SERVICE_ERROR: 'Error communicating with Board Service',
    COLUMN_UPDATE_ERROR: 'Error updating cardOrderIds for column',
  };
  
  module.exports = { STATUS_CODES, ERROR_MESSAGES };