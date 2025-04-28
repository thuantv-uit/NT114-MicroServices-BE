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
    INVALID_ID: 'Invalid ID',
    USER_NOT_FOUND: 'User not found',
    BOARD_NOT_FOUND: 'Board not found',
    COLUMN_NOT_FOUND: 'Column not found',
    CARD_NOT_FOUND: 'Card not found',
    UNAUTHORIZED: 'Unauthorized',
    NOT_BOARD_OWNER: 'Only board owner can invite',
    NOT_INVITED_TO_BOARD: 'User must be invited to board first',
    NOT_INVITED_TO_COLUMN: 'User must be invited to column first',
    ALREADY_INVITED: 'User already invited',
    INVITATION_NOT_FOUND: 'Invitation not found',
    INVITATION_NOT_PENDING: 'Invitation is not pending',
    INVITATION_SENT: 'Invitation sent successfully',
    INVITATION_ACCEPTED: 'Invitation accepted successfully',
    INVITATION_REJECTED: 'Invitation rejected successfully',
    INVITATION_SERVICE_UNAVAILABLE: 'Error communicating with Invitation Service',
  };
  
  module.exports = { STATUS_CODES, ERROR_MESSAGES };