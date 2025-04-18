const axios = require('axios');
require('dotenv').config();

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

const checkBoardAccess = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) return null;
    throw new Error('Error communicating with Board Service');
  }
};

const updateBoardColumnOrder = async (boardId, _id, token) => {
  try {
    const response = await axios.put(
      `${BOARD_SERVICE_URL}/api/boards/${boardId}`,
      { columnOrderIds: { $push: _id } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw new Error('Error communicating with list columnOrderIds: ' + error.message);
  }
};

module.exports = { checkBoardAccess, updateBoardColumnOrder };