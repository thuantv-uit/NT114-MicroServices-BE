const { createBoard } = require("../../controllers/boardController");
const Board = require("../../models/boardModel");
const { checkUserExists } = require("../../services/user");
const helpers = require("../../utils/helpers");
const { extractToken } = require("../../utils/helpers");
const { mockResponse, mockNext } = require("../helpers/mockReqRes");

// Mock chỉ service user và helpers liên quan đến auth/user check
jest.mock("../../services/user");
jest.mock("../../utils/helpers");

describe("Board Controller Integration - createBoard (with mocked user service)", () => {
  const mockUserId = "507f1f77bcf86cd799439011";
  const mockToken = "fake-jwt-token-for-test";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock extractToken luôn trả về token
    extractToken.mockReturnValue(mockToken);

    jest.spyOn(helpers, 'throwError').mockImplementation((message, status) => {
      const err = new Error(message);
      err.statusCode = status;
      throw err;
    });

    // Mock checkUserExists: luôn trả về user giả hợp lệ
    checkUserExists.mockResolvedValue({
      _id: mockUserId,
      username: "fakeuser",
      email: "fake@test.com",
    });
  });

  it("should create a new board in database with full data", async () => {
    const req = {
      user: { id: mockUserId }, // req.user từ auth middleware
      body: {
        title: "My Integration Board",
        description: "Created during integration test",
        backgroundColor: "#abcdef",
        backgroundImage: "https://example.com/board-bg.jpg",
      },
    };

    const res = mockResponse();

    await createBoard(req, res, mockNext);

    // Kiểm tra response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();

    const returnedBoard = res.json.mock.calls[0][0];
    //console.log("debug: ",returnedBoard);
    expect(returnedBoard.title).toBe("My Integration Board");
    expect(returnedBoard.userId.toString()).toBe(mockUserId);
    expect(returnedBoard.memberIds).toEqual([]);

    // Quan trọng: Kiểm tra board THẬT đã được tạo trong DB
    const boardInDB = await Board.findById(returnedBoard._id);
    expect(boardInDB).not.toBeNull();
    expect(boardInDB.title).toBe("My Integration Board");
    expect(boardInDB.description).toBe("Created during integration test");
    expect(boardInDB.backgroundColor).toBe("#abcdef");
    expect(boardInDB.backgroundImage).toBe("https://example.com/board-bg.jpg");
    expect(boardInDB.userId.toString()).toBe(mockUserId);
    expect(boardInDB.memberIds).toHaveLength(0);
  });

  it("should create board with only required field (title)", async () => {
    const req = {
      user: { id: mockUserId },
      body: {
        title: "Minimal Board Test",
      },
    };

    const res = mockResponse();

    await createBoard(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);

    const returnedBoard = res.json.mock.calls[0][0];

    const boardInDB = await Board.findById(returnedBoard._id);
    expect(boardInDB.title).toBe("Minimal Board Test");
    expect(boardInDB.description).toBeUndefined(); // hoặc "" tùy schema
    expect(boardInDB.backgroundColor).toBe("#ffffff"); // default
    expect(boardInDB.backgroundImage).toBe(""); // default
    expect(boardInDB.memberIds).toEqual([]);
    expect(boardInDB.userId.toString()).toBe(mockUserId);
  });

  it("should handle user not found (mocked case)", async () => {
    // Test trường hợp checkUserExists trả về null
    checkUserExists.mockResolvedValue(null);

    const req = {
      user: { id: mockUserId },
      body: { title: "Should Fail Board" },
    };

    const res = mockResponse();

    await createBoard(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    // Không có board nào được tạo
    const boardInDB = await Board.findOne({ title: "Should Fail Board" });
    expect(boardInDB).toBeNull();
  });
});