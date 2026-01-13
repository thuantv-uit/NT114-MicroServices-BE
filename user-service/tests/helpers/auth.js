const request = require("supertest");
const createTestApp = require("./testApp");

const app = createTestApp();

const registerAndLogin = async (override = {}) => {
  const user = {
    username: "authUser",
    email: "auth@gmail.com",
    password: "123456",
    ...override,
  };

  // đảm bảo user tồn tại (ignore duplicate)
  await request(app)
    .post("/users/register")
    .send(user);

  // login
  const res = await request(app)
    .post("/users/login")
    .send({
      email: user.email,
      password: user.password,
    });

  if (!res.body || !res.body.token) {
    throw new Error("❌ Login failed in test helper");
  }

  return res.body.token;
};

module.exports = {
  registerAndLogin,
};
