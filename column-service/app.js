const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const columnRoutes = require('./routes/columnRoute');
require('dotenv').config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/columns', columnRoutes);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});