const request = require("supertest");
const jwt = require("jsonwebtoken");
const createTestApp = require("../helpers/testApp");
const { checkUserExists } = require("../../services/user");
const helpers = require("../../utils/helpers");

const app = createTestApp();

jest.mock("../../services/user");

jest.spyOn(helpers, "extractToken").mockImplementation((req) => req.headers.authorization?.split(" ")[1] || null);

const JWT_SECRET = process.env.JWT_SECRET || "tranthuan410";
const mockUserId = "507f1f77bcf86cd799439011";
let token;
//let boardId;

describe("Board Routes – Integration Workflow Test", () => {

  beforeAll(() => {
    // Generate token thủ công với userId giả
    token = jwt.sign({ id: mockUserId }, JWT_SECRET, { expiresIn: "1h" });

    // Mock checkUserExists luôn return user hợp lệ cho mockUserId
    checkUserExists.mockResolvedValue({
      _id: mockUserId,
      username: "fakeworkflowuser",
      email: "fakeworkflow@gmail.com",
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock checkUserExists (vẫn return user hợp lệ mặc định)
    checkUserExists.mockResolvedValue({
      _id: mockUserId,
      username: "fakeworkflowuser",
      email: "fakeworkflow@gmail.com",
    });
  });

  describe("POST /boards", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app)
        .post("/boards")
        .send({ title: "No Token Board" });

      expect(res.statusCode).toBe(401);
    });

    it("❌ should reject invalid payload (missing title)", async () => {
      const res = await request(app)
        .post("/boards")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "No title" });

      expect(res.statusCode).toBe(400); // Hoặc status validation fail tùy handling
    });

    it("✅ should create board successfully", async () => {
      const res = await request(app)
        .post("/boards")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Workflow Board",
          description: "Created via route workflow test",
          backgroundColor: "#ff0000",
          //backgroundImage: "https://example.com/bg.jpg",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe("Workflow Board");
      expect(res.body.userId.toString()).toBe(mockUserId);
      expect(res.body.memberIds).toEqual([]);

      boardId = res.body._id;
    });
  });
});