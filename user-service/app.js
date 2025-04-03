const express = require('express');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Kết nối database
connectDB();

app.use(cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Khởi động server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});