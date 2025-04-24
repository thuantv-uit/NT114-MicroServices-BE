const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DATABASE_NAME;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }
  if (!dbName) {
    throw new Error('DATABASE_NAME is not defined in environment variables');
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: dbName,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};

module.exports = connectDB;