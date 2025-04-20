const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const COLUMN_SERVICE_URL = process.env.COLUMN_SERVICE_URL || 'http://localhost:3003';

const getColumnById = async (columnId, userId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) {
      return null;
    }
    throwError(ERROR_MESSAGES.COLUMN_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const updateColumnCardOrder = async (columnId, cardId, token) => {
  try {
    const response = await axios.put(
      `${COLUMN_SERVICE_URL}/api/columns/${columnId}`,
      { cardOrderIds: { $push: cardId } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throwError(`${ERROR_MESSAGES.COLUMN_UPDATE_ERROR}: ${error.message}`, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getColumnById, updateColumnCardOrder };