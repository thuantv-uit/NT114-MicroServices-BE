const axios = require('axios');
require('dotenv').config();

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

const checkBoardAccess = async (boardId, userId) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      data: { userId },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) return null;
    throw new Error('Error communicating with Board Service');
  }
};

module.exports = { checkBoardAccess };