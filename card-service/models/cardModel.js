const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
  process: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0, 
    required: true 
  },
  image : { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Card', cardSchema);