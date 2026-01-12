const express = require("express");
const userRoutes = require("../../routes/userRoute");

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/users", userRoutes);

  return app;
};

module.exports = createTestApp;
