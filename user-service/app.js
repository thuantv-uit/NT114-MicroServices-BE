const express = require('express');
const cors = require('cors');
const passport = require('passport');
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoute');
const googleAuthRoute = require('./service/googleAuthRoute'); 
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();
require('./service/Passport');


const app = express();

// Kết nối MongoDB và xử lý lỗi
const startServer = async () => {
  try {
    await connectDB();
    app.use(cors());
    app.use(express.json());
    app.use(passport.initialize());

    app.use('/api/users', userRoutes);
    app.use('/auth/google', googleAuthRoute);

    app.use(errorHandler);

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1); // Chỉ thoát nếu không thể khởi động server
  }
};

startServer();

// Xử lý lỗi không được bắt
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test pipeline CI/CD part 5