const axios = require('axios');
require('dotenv').config();

const BOARD_SERVICE_URL = process.env.BOARD_SERVICE_URL || 'http://localhost:3002';

// Kiểm tra board có tồn tại và user có quyền truy cập
const checkBoardAccess = async (boardId, userId, token) => {
  try {
    const response = await axios.get(`${BOARD_SERVICE_URL}/api/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const board = response.data;
    if (board.userId !== userId) {
      return { error: 'Không có quyền truy cập board này', status: 403 };
    }
    return board; // Trả về thông tin board nếu có quyền
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { error: 'Board không tồn tại', status: 404 };
    }
    throw new Error('Lỗi khi liên lạc với Board Service');
  }
};

module.exports = { checkBoardAccess };