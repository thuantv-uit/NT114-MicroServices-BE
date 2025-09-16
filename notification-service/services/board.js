const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

const getBoardById = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/all/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      return null;
    }
    throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
};

const updateMemberIds = async (boardId, memberIds, token) => {
  try {
    const response = await axios.post(
      `${BOARD_SERVICE_URL}/api/boards/${boardId}/members`,
      { memberIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Member IDs updated successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.BOARD_NOT_FOUND, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_AUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    throwError(ERROR_MESSAGES.BOARD_UPDATE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getBoardById, updateMemberIds };