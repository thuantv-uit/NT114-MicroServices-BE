const axios = require('axios');
require('dotenv').config();

const LIST_SERVICE_URL = process.env.LIST_SERVICE_URL || 'http://localhost:3003';

// Lấy thông tin list theo ID
const getListById = async (listId, token) => {
  try {
    const response = await axios.get(`${LIST_SERVICE_URL}/api/lists/${listId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // List không tồn tại
    }
    throw new Error('Lỗi khi giao tiếp với List Service');
  }
};

module.exports = { getListById };