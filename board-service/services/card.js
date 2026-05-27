const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const CARD_SERVICE_URL = process.env.CARD_SERVICE_URL || 'http://localhost:3004';

/**
 * Lấy card theo ID
 */
const getCardById = async (cardId, token) => {
  try {
    const response = await axios.get(`${CARD_SERVICE_URL}/api/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    console.error('❌ getCardById error:', error.response?.status, error.response?.data);
    throwError(ERROR_MESSAGES.CARD_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Lấy cards theo columnId
 */
const getCardsByColumn = async (columnId, token) => {
  try {
    const response = await axios.get(`${CARD_SERVICE_URL}/api/cards/column/${columnId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return [];
    throwError(ERROR_MESSAGES.CARD_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Tạo card mới
 * ✅ Chỉ gửi description nếu có giá trị — tránh empty string bị validation reject
 */
const createCard = async ({ title, description, columnId }, token) => {
  const body = { title, columnId };
  if (description && description.trim()) {
    body.description = description.trim();
  }
  console.log('📦 createCard body:', JSON.stringify(body));
  try {
    const response = await axios.post(
      `${CARD_SERVICE_URL}/api/cards`,
      body,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ createCard error:', error.response?.status, error.response?.data);
    throwError(ERROR_MESSAGES.CARD_SERVICE_ERROR, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { getCardById, getCardsByColumn, createCard };