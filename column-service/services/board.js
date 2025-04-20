const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

const checkBoardAccess = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    return null; // Trả về null cho tất cả lỗi để xử lý "Not found column" ở card service
  }
};

const updateBoardColumnOrder = async (boardId, columnId, token) => {
  try {
    const response = await axios.put(
      `${BOARD_SERVICE_URL}/api/boards/${boardId}`,
      { columnOrderIds: { $push: columnId } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throwError(`${ERROR_MESSAGES.BOARD_UPDATE_ERROR}: ${error.message}`, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { checkBoardAccess, updateBoardColumnOrder };