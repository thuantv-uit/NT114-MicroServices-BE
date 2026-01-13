const mongoose = require('mongoose');
const { createColumn } = require('../../controllers/columnController');
const Column = require('../../models/columnModel');
const { checkUserExists } = require('../../services/user');
const { extractToken, isValidObjectId } = require('../../utils/helpers');
const { updateBoardColumnOrder } = require('../../services/board');
const { validateUserAndBoardAccess } = require('../../utils/permissions'); // ← thêm import
const { mockResponse, mockNext } = require('../helpers/mockReqRes');

jest.mock('../../services/user');
jest.mock('../../utils/helpers');
jest.mock('../../services/board');
jest.mock('../../utils/permissions'); // ← Quan trọng: mock permissions

describe('Column Controller Integration - createColumn', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockBoardId = new mongoose.Types.ObjectId().toString();
  const mockToken = 'fake-jwt-token-for-testing-purpose';

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock helpers
    extractToken.mockReturnValue(mockToken);
    isValidObjectId.mockReturnValue(true); // giả lập boardId luôn hợp lệ trong happy path

    // Mock user service
    checkUserExists.mockResolvedValue({
      _id: mockUserId,
      username: 'testuser',
      email: 'test@example.com',
    });

    // Mock board service
    updateBoardColumnOrder.mockResolvedValue(undefined);

    // ← Quan trọng: Mock validateUserAndBoardAccess để pass check owner
    validateUserAndBoardAccess.mockResolvedValue({
      board: {
        userId: mockUserId, // chính chủ board → pass check NOT_BOARD_OWNER
        columnOrderIds: [], // để spread operator an toàn
      },
    });
  });

  afterEach(async () => {
    await Column.deleteMany({});
  });

  describe('Happy path - Create column successfully', () => {
    it('Should create new column with full field and call update column order', async () => {
      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Todo List',
          boardId: mockBoardId,
          backgroundColor: '#e3f2fd',
        },
      };

      const res = mockResponse();

      await createColumn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledTimes(1);

      const createdColumn = res.json.mock.calls[0][0];
      expect(createdColumn.title).toBe('Todo List');
      expect(createdColumn.boardId.toString()).toBe(mockBoardId);
      expect(createdColumn.backgroundColor).toBe('#e3f2fd');

      // Kiểm tra DB thật
      const columnInDB = await Column.findById(createdColumn._id);
      expect(columnInDB).not.toBeNull();
      expect(columnInDB.title).toBe('Todo List');
      expect(columnInDB.boardId.toString()).toBe(mockBoardId);

      // Kiểm tra service board được gọi
      expect(updateBoardColumnOrder).toHaveBeenCalledTimes(1);
      expect(updateBoardColumnOrder).toHaveBeenCalledWith(
        mockBoardId,
        expect.arrayContaining([createdColumn._id.toString()]),
        mockToken
      );
    });

    it('Should create column only field require (title)', async () => {
      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Minimal Column',
          boardId: mockBoardId,
        },
      };

      const res = mockResponse();

      await createColumn(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);

      const createdColumn = res.json.mock.calls[0][0];

      const columnInDB = await Column.findById(createdColumn._id);
      expect(columnInDB.title).toBe('Minimal Column');
      expect(columnInDB.backgroundColor).toBe('#ffffff'); // hoặc default nếu có
      expect(columnInDB.memberIds).toEqual([]);

      expect(updateBoardColumnOrder).toHaveBeenCalled();
    });
  });

  describe('Error cases', () => {
    it('Should return error when boardId invaild', async () => {
      // Override mock cho case này
      isValidObjectId.mockReturnValue(false);

      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Invalid Board Column',
          boardId: 'not-a-valid-objectid',
        },
      };

      const res = mockResponse();

      await createColumn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();

      const columns = await Column.find({ title: 'Invalid Board Column' });
      expect(columns).toHaveLength(0);
    });

    it('Should hanlde error when updateBoardColumnOrder failed', async () => {
      updateBoardColumnOrder.mockRejectedValue(new Error('Board service failed'));

      const req = {
        user: { id: mockUserId },
        body: {
          title: 'Column That Will Fail',
          boardId: mockBoardId,
        },
      };

      const res = mockResponse();

      await createColumn(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();

      // Nếu bạn có transaction → column không được lưu
      // Nếu không → column vẫn tồn tại (tùy logic hiện tại của controller)
      // const column = await Column.findOne({ title: 'Column That Will Fail' });
      // expect(column).toBeNull(); // bật nếu có rollback
    });
  });
});
