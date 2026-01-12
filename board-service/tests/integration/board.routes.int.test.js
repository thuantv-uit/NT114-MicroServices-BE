// tests/integration/board.routes.int.test.js

const request = require("supertest");
const jwt = require("jsonwebtoken");
const createTestApp = require("../helpers/testApp");
const { checkUserExists } = require("../../services/user"); // Để mock
const helpers = require("../../utils/helpers"); // Để spyOn extractToken + throwError nếu cần

const app = createTestApp();

// Mock service user (độc lập, không phụ thuộc user-service thật)
jest.mock("../../services/user");

// Optional: SpyOn helpers để control throwError (nếu cần test fail case throw đúng)
jest.spyOn(helpers, "extractToken").mockImplementation((req) => req.headers.authorization?.split(" ")[1] || null);

const JWT_SECRET = process.env.JWT_SECRET || "tranthuan410"; // Thay bằng secret thật của .env.test hoặc hardcode tạm cho test
const mockUserId = "507f1f77bcf86cd799439011"; // ObjectId giả hợp lệ
let token; // Token giả hợp lệ
let boardId; // Lưu boardId sau khi tạo

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

      //console.log("token create board: ", token);
      expect(res.statusCode).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.title).toBe("Workflow Board");
      expect(res.body.userId.toString()).toBe(mockUserId);
      expect(res.body.memberIds).toEqual([]);

      boardId = res.body._id;
    });
  });

  describe("GET /boards", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app).get("/boards");
      expect(res.statusCode).toBe(401);
    });

    it("✅ should return list of boards", async () => {
      const res = await request(app)
        .get("/boards/list")
        .set("Authorization", `Bearer ${token}`);

      //console.log("token: ", token);
      //console.log("status code: ", res.statusCode);
      //console.log("error body: ", res.body);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      const createdBoard = res.body.find(b => b._id === boardId);
      expect(createdBoard.title).toBe("Workflow Board");
    });
  });

  describe("GET /boards/:id", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app).get(`/boards/${boardId}`);
      expect(res.statusCode).toBe(401);
    });

    it("✅ should return board by id", async () => {
      const res = await request(app)
        .get(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(boardId);
      expect(res.body.title).toBe("Workflow Board");
    });
  });

  describe("PUT /boards/:id", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app)
        .put(`/boards/${boardId}`)
        .send({ title: "Hack" });

      expect(res.statusCode).toBe(401);
    });

    it("✅ should update board successfully", async () => {
      const res = await request(app)
        .put(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Updated Workflow Board",
          description: "Updated description",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("Updated Workflow Board");
      expect(res.body.description).toBe("Updated description");
    });
  });

  describe("DELETE /boards/:id", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app).delete(`/boards/${boardId}`);
      expect(res.statusCode).toBe(401);
    });

    it("✅ should delete board successfully", async () => {
      const res = await request(app)
        .delete(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("deleted"); // Tùy message trong controller

      // Kiểm tra board đã xóa
      const checkRes = await request(app)
        .get(`/boards/${boardId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(checkRes.statusCode).toBe(404);
    });
  });
});
