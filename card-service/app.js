const express = require('express');
const connectDB = require('./config/db');
const cardRoutes = require('./routes/cardRoutes');
require('dotenv').config();

const app = express();

connectDB();

app.use(express.json());
app.use('/api/cards', cardRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Card Service running on port ${PORT}`);
});