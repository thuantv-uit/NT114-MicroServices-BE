const express = require('express');
const connectDB = require('./config/db');
const listRoutes = require('./routes/listRoutes');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Kết nối database
connectDB();

app.use(cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/lists', listRoutes);

// Khởi động server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`List Service running on port ${PORT}`);
});