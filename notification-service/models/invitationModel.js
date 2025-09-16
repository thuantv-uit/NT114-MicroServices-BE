const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  type: { type: String, enum: ['board', 'column', 'card'], required: true },
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: function() { return this.type !== 'board'; } },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: function() { return this.type === 'card'; } },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member', 'viewer'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

invitationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Invitation', invitationSchema);