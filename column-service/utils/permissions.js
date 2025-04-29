const { getBoardById } = require('../services/board');
const { checkBoardInvitation } = require('../services/invitation');
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const validateUserAndBoardAccess = async (boardId, userId, token) => {
  const board = await getBoardById(boardId, userId, token);
  // Kiểm tra user là owner hoặc được mời vào board
  if (board.userId.toString() !== userId) {
    const boardInvitation = await checkBoardInvitation(boardId, userId, token);
    if (!boardInvitation || !boardInvitation.length) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_BOARD, STATUS_CODES.FORBIDDEN);
    }
  }
  return { board };
};

module.exports = { validateUserAndBoardAccess };