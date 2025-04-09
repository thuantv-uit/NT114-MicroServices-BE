const axios = require('axios');
require('dotenv').config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const checkUserExists = async (userId, token) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new Error('Error communicating with User Service');
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
    if (error.response?.status === 404) return null;
    throw new Error('Error communicating with User Service');
  }
};

module.exports = { checkUserExists, checkUserExistsByEmail };