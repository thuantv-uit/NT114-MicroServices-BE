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
    return null;
  }
};

const checkUserExistsByEmail = async (email, token) => {
  try {
    const response = await axios.post(
      `${USER_SERVICE_URL}/api/users/email`,
      { email },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    return null;
  }
};

module.exports = { checkUserExists, checkUserExistsByEmail };