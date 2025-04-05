const axios = require('axios');
require('dotenv').config();

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

// Lấy thông tin board theo ID và kiểm tra quyền truy cập
const getBoardById = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const board = response.data;
    if (board.userId !== userId) {
      return { error: 'Bạn không có quyền truy cập board này', status: 403 };
    }
    return board;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { error: 'Board không tồn tại', status: 404 };
    }
    throw new Error('Lỗi khi giao tiếp với Board Service');
  }
};

module.exports = { getBoardById };