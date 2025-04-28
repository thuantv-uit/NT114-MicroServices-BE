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
  BOARD_NOT_FOUND: 'Board not found',
  INVALID_ID: 'Invalid board ID',
  NOT_BOARD_OWNER: 'Only board owner can perform this action',
  BOARD_DELETED: 'Board deleted successfully',
  UNAUTHORIZED_OR_BOARD_NOT_FOUND: 'Unauthorized or board not found',
  INVITATION_SERVICE_UNAVAILABLE: 'Error communicating with Invitation Service',
};

module.exports = { STATUS_CODES, ERROR_MESSAGES };