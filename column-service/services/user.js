const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const checkUserExists = async (userId, token) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    return null; // Trả về null cho tất cả lỗi
  }
};

module.exports = { checkUserExists };