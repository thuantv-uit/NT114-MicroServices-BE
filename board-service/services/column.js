const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const COLUMN_SERVICE_URL = process.env.COLUMN_SERVICE_URL || 'http://localhost:3003';

/**
 * Lấy column theo ID — có check quyền
 */
const getColumnById = async (columnId, token) => {
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
 * Lấy column theo ID — KHÔNG check quyền (internal call)
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
 * Lấy tất cả columns theo boardId
 */
const getColumnsByBoard = async (boardId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/board/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return [];
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Tạo column mới
 */
const createColumn = async ({ title, boardId }, token) => {
  try {
    const response = await axios.post(
      `${COLUMN_SERVICE_URL}/api/columns`,
      { title, boardId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Cập nhật cardOrderIds của column
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
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Cập nhật columnOrderIds của board (gọi ngược lại board service — dùng nội bộ)
 */
const updateBoardColumnOrder = async (boardId, columnOrderIds, token) => {
  try {
    const response = await axios.put(
      `${COLUMN_SERVICE_URL}/api/columns/board/${boardId}`,
      { columnOrderIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = {
  getColumnById,
  getColumnByIdForAll,
  getColumnsByBoard,
  createColumn,
  updateColumnCardOrder,
  updateBoardColumnOrder,
};