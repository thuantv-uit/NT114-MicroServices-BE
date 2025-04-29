const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const INVITATION_SERVICE_URL = process.env.INVITATION_SERVICE_URL || 'http://localhost:3005';

const checkBoardInvitation = async (boardId, userId, token) => {
  try {
    const url = boardId
      ? `${INVITATION_SERVICE_URL}/api/invitations/board/${boardId}/user/${userId}`
      : `${INVITATION_SERVICE_URL}/api/invitations/board/user/${userId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Đảm bảo trả về danh sách lời mời (có thể rỗng)
    return response.data || [];
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    throwError(ERROR_MESSAGES.INVITATION_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { checkBoardInvitation };