const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Tiêu đề cột, bắt buộc
  boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true }, // ID của bảng chứa cột
  position: { type: Number, required: true }, // Vị trí của cột trong bảng
  cardOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }], // Danh sách ID card theo thứ tự
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});

module.exports = mongoose.model('Column', columnSchema);