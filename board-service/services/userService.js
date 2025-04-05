const axios = require('axios');
require('dotenv').config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

const checkUserExists = async (userId, token) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`, // Sử dụng token từ request
      },
    });
    return response.data; // Trả về thông tin user nếu tồn tại
  } catch (error) {
    console.error('User Service error:', error.message, error.response?.data);
    if (error.response && error.response.status === 404) {
      return null; // User không tồn tại
    }
    throw new Error('Error communicating with User Service');
  }
};

module.exports = { checkUserExists };