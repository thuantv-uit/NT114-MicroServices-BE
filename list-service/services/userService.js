const axios = require('axios');
require('dotenv').config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Kiểm tra user có tồn tại hay không
const checkUserExists = async (userId, token) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Trả về thông tin user nếu tồn tại
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // User không tồn tại
    }
    throw new Error('Lỗi khi liên lạc với User Service');
  }
};

module.exports = { checkUserExists };