const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: { type: String, required: true },
  backgroundColor: { type: String, default: '#ffffff' },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  cardOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }],
  memberIds: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, enum: ['admin', 'member', 'viewer'] }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

columnSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Column', columnSchema);