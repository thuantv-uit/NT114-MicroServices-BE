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
    if (error.response?.status === 404) {
      throwError(ERROR_MESSAGES.NOT_FOUND_COLUMN, STATUS_CODES.NOT_FOUND);
    }
    if (error.response?.status === 403) {
      throwError(ERROR_MESSAGES.NOT_INVITED_TO_COLUMN, STATUS_CODES.FORBIDDEN);
    }
    throwError(ERROR_MESSAGES.COLUMN_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }
};

module.exports = { getColumnById };