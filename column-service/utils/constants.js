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
  NOT_FOUND_COLUMN: 'Column not found',
  UNAUTHORIZED_OR_BOARD_NOT_FOUND: 'Unauthorized or board not found',
  COLUMN_DELETED: 'Column deleted successfully',
  SERVER_ERROR: 'Server error',
  INVALID_COLUMN_ID: 'Invalid column ID',
  INVALID_BOARD_ID: 'Invalid board ID',
  INVALID_CARD_ID: 'Invalid card ID',
  BOARD_UPDATE_ERROR: 'Error updating columnOrderIds for the board',
  NOT_INVITED_TO_COLUMN: 'User not invited to column',
  INVITATION_SERVICE_UNAVAILABLE: 'Error communicating with Invitation Service',
};

module.exports = { STATUS_CODES, ERROR_MESSAGES };