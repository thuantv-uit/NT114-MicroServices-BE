const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
  position: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Card', cardSchema);