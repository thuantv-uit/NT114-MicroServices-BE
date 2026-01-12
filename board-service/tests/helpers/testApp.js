const express = require("express");
const boardRoutes = require("../../routes/boardRoute");

const createTestApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/boards", boardRoutes);

  return app;
};

module.exports = createTestApp;
