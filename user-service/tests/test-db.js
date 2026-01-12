const { connectDB } = require("./helpers/db");

(async () => {
  console.log("🔍 Testing MongoDB connection...");

  try {
    await connectDB();
    console.log("🎉 MongoDB connection test SUCCESS");
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB connection test FAILED");
    console.error(error.message || error);
    process.exit(1);
  }
})();
