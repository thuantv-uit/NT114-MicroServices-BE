const request = require("supertest");
const createTestApp = require("./testApp");

const app = createTestApp();

const createUser = async (override = {}) => {
  const user = {
    username: "factoryUser",
    email: "factory@gmail.com",
    password: "123456",
    ...override,
  };

  await request(app)
    .post("/users/register")
    .send(user);

  return user;
};

module.exports = {
  createUser,
};
