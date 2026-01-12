const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("./helpers/db");

beforeAll(async () => {
  jest.setTimeout(30000); // ⬅️ QUAN TRỌNG
  await connectDB();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await disconnectDB();
});
