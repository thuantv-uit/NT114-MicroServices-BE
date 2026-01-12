const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb://root:rootpassword@localhost:27017/appdb?authSource=admin"
  );
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

module.exports = {
  connectDB,
  disconnectDB,
};
