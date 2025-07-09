const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  backgroundColor: { type: String, default: '#ffffff' },
  backgroundImage: { type: String, default: '' },
  backgroundColorUpdatedAt: { type: Date, default: Date.now }, // New field
  backgroundImageUpdatedAt: { type: Date, default: Date.now }, // New field
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  columnOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Column', default: [] }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

boardSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Board', boardSchema);