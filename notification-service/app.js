const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const invitationRoutes = require('./routes/invitationRoute');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();

const startServer = async () => {
  try {
    await connectDB();
    app.use(cors());
    app.use(express.json());
    app.use('/api/invitations', invitationRoutes);
    app.use(errorHandler);

    const PORT = process.env.PORT || 3005;
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