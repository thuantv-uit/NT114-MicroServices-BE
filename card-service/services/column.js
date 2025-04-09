const axios = require('axios');
require('dotenv').config();

const COLUMN_SERVICE_URL = process.env.COLUMN_SERVICE_URL || 'http://localhost:3003';

const getColumnById = async (columnId, userId, token) => {
  try {
    const response = await axios.get(`${COLUMN_SERVICE_URL}/api/columns/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 403) return null;
    throw new Error('Error communicating with Column Service');
  }
};

module.exports = { getColumnById };