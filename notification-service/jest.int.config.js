module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.int.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.int.js"],
  testTimeout: 30000,
  detectOpenHandles: true,
};
