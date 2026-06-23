const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const boardRoutes = require('./routes/boardRoute');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();

const startServer = async () => {
  try {
    await connectDB();
    app.use(cors());
    app.use(express.json());

    // ✅ Health check route
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    app.use('/api/boards', boardRoutes);
    app.use(errorHandler);

    const PORT = process.env.PORT || 3002;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test pipeline CI/CD part 7