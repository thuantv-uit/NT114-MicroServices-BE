const axios = require('axios');
require('dotenv').config();
const { throwError } = require('../utils/helpers');
const { STATUS_CODES, ERROR_MESSAGES } = require('../utils/constants');

const INVITATION_SERVICE_URL = process.env.INVITATION_SERVICE_URL || 'http://localhost:3005';

const checkCardInvitation = async (cardId, userId, token) => {
  try {
    const response = await axios.get(`${INVITATION_SERVICE_URL}/api/invitations/card/${cardId}/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throwError(ERROR_MESSAGES.INVITATION_SERVICE_UNAVAILABLE, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

const checkColumnInvitation = async (columnId, userId, token) => {
  try {
    const response = await axios.get(`${INVITATION_SERVICE_URL}/api/invitations/column/${columnId}/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throwError(ERROR_MESSAGES.INVITATION_SERVICE_UNAVAILABLE, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

module.exports = { checkCardInvitation, checkColumnInvitation };