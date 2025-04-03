const express = require('express');
const connectDB = require('./config/db');
const boardRoutes = require('./routes/boardRoutes');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Kết nối database
connectDB();

app.use(cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/boards', boardRoutes);

// Khởi động server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Board Service running on port ${PORT}`);
});