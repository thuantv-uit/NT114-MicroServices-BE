const request = require("supertest");
const createTestApp = require("../helpers/testApp");
const { registerAndLogin } = require("../helpers/auth");
const { createUser } = require("../helpers/userFactory");

const app = createTestApp();

describe("User Routes – Integration Workflow Test", () => {

  describe("POST /users/register", () => {
    it("❌ should reject invalid payload", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          username: "ab",
          email: "invalid",
          password: "123",
        });

      expect(res.statusCode).toBe(400);
    });

    it("✅ should create user successfully", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          username: "workflowUser",
          email: "workflow@gmail.com",
          password: "123456",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toBeDefined();
    });
  });

  describe("POST /users/login", () => {
    it("✅ should login successfully", async () => {
      await createUser({
        email: "login@gmail.com",
      });

      const res = await request(app)
        .post("/users/login")
        .send({
          email: "login@gmail.com",
          password: "123456",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe("GET /users/me", () => {
    it("❌ should reject without token", async () => {
      const res = await request(app).get("/users/me");
      expect(res.statusCode).toBe(401);
    });

    it("✅ should return current user", async () => {
      const token = await registerAndLogin({
        email: "me@gmail.com",
      });

      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      //console.log(res.body);
      expect(res.body.email).toBeDefined();
    });
  });

});
