const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const COLUMN_SERVICE_URL = process.env.COLUMN_SERVICE_URL || 'http://localhost:3003';

/**
 * Lấy column theo ID — có check quyền bên Column Service (viewer trở lên)
 */
const getColumnById = async (columnId, userId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Lấy column theo ID — không check quyền, dùng cho internal service call
 * (Card Service dùng để lấy column + memberIds để tự check role)
 */
const getColumnByIdForAll = async (columnId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/all/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Cập nhật thứ tự card trong column
 */
const updateColumnCardOrder = async (columnId, cardOrderIds, token) => {
  try {
    const response = await axios.put(
      `${COLUMN_SERVICE_URL}/api/columns/${columnId}`,
      { cardOrderIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_BOARD_OWNER, STATUS_CODES.FORBIDDEN);
    }
    throwError(`${ERROR_MESSAGES.COLUMN_UPDATE_ERROR}: ${error.message}`, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Lấy danh sách columns theo board — đã filter theo memberIds bên Column Service
 */
const getColumnsByBoard = async (boardId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/board/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMNS, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_AUTHORIZED, STATUS_CODES.FORBIDDEN);
    }
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getColumnById, getColumnByIdForAll, updateColumnCardOrder, getColumnsByBoard };