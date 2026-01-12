const { connectDB } = require("./db");

(async () => {
  console.log("🔍 Testing MongoDB connection...");
  await connectDB();
  console.log("🎉 MongoDB connection test SUCCESS");
  process.exit(0);
})();
