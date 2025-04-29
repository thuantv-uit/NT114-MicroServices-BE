const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

const getBoardById = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.UNAUTHORIZED_OR_BOARD_NOT_FOUND, STATUS_CODES.FORBIDDEN);
    }
    throwError(ERROR_MESSAGES.BOARD_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const updateBoardColumnOrder = async (boardId, columnOrderIds, token) => {
  try {
    const response = await axios.put(
      `${BOARD_SERVICE_URL}/api/boards/${boardId}`,
      { columnOrderIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    throwError(`${ERROR_MESSAGES.BOARD_UPDATE_ERROR}: ${error.message}`, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getBoardById, updateBoardColumnOrder };