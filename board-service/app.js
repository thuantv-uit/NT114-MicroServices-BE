const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const boardRoutes = require('./routes/boardRoute');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/boards', boardRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});