const mongoose = require('mongoose');
const { createCard } = require('../../controllers/cardController');
const Card = require('../../models/cardModel');

const { extractToken, isValidObjectId } = require('../../utils/helpers');
const { getColumnById, updateColumnCardOrder } = require('../../services/column');
const { validateUserAndBoardAccess } = require('../../utils/permissions');
const { checkColumnInvitation } = require('../../services/invitation');
const { mockResponse, mockNext } = require('../helpers/mockReqRes');

jest.mock('../../utils/helpers');
jest.mock('../../services/column');
jest.mock('../../utils/permissions');
jest.mock('../../services/invitation');

describe('Card Controller Integration - createCard', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockBoardId = new mongoose.Types.ObjectId().toString();
  const mockColumnId = new mongoose.Types.ObjectId().toString();
  const mockToken = 'fake-jwt-token';

  beforeEach(async () => {
    jest.clearAllMocks();

    extractToken.mockReturnValue(mockToken);
    isValidObjectId.mockReturnValue(true);

    getColumnById.mockResolvedValue({
      _id: mockColumnId,
      boardId: mockBoardId,
      cardOrderIds: [],
    });

    validateUserAndBoardAccess.mockResolvedValue({
      board: {
        userId: mockUserId, // owner
      },
    });

    checkColumnInvitation.mockResolvedValue([]);
    updateColumnCardOrder.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await Card.deleteMany({});
  });

  // ============================
  // HAPPY PATH
  // ============================
  describe('Happy path - Create card successfully', () => {
    it('Should create card with full fields', async () => {
      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Test Card',
          description: 'Card description',
          columnId: mockColumnId,
          process: 50,
          deadline: new Date(),
        },
      };

      const res = mockResponse();

      await createCard(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledTimes(1);

      const createdCard = res.json.mock.calls[0][0];
      expect(createdCard.title).toBe('Test Card');
      expect(createdCard.process).toBe(50);
      expect(createdCard.columnId.toString()).toBe(mockColumnId);

      // DB thật
      const cardInDB = await Card.findById(createdCard._id);
      expect(cardInDB).not.toBeNull();
      expect(cardInDB.title).toBe('Test Card');

      // side-effect
      expect(updateColumnCardOrder).toHaveBeenCalledWith(
        mockColumnId,
        expect.arrayContaining([createdCard._id.toString()]),
        mockToken
      );
    });

    it('Should create card with default process = 0', async () => {
      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Default Process Card',
          columnId: mockColumnId,
        },
      };

      const res = mockResponse();

      await createCard(req, res, mockNext);

      const createdCard = res.json.mock.calls[0][0];
      expect(createdCard.process).toBe(0);
    });
  });

  // ============================
  // ERROR CASES
  // ============================
    it('Should return error when process out of range', async () => {
      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Invalid Process',
          columnId: mockColumnId,
          process: 150,
        },
      };

      const res = mockResponse();

      await createCard(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('Should handle error when updateColumnCardOrder fails', async () => {
      updateColumnCardOrder.mockRejectedValue(new Error('Update order failed'));

      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Fail Order Update',
          columnId: mockColumnId,
        },
      };

      const res = mockResponse();

      await createCard(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();

      // tuỳ logic rollback
      // const card = await Card.findOne({ title: 'Fail Order Update' });
      // expect(card).toBeNull();
    });
  });

