const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const cardRoutes = require('./routes/cardRoute');
require('dotenv').config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/cards', cardRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});