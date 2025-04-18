const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Tiêu đề board, bắt buộc
  description: { type: String }, // Mô tả board, không bắt buộc
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID người tạo bảng
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Danh sách ID thành viên
  columnOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Column' }], // Danh sách ID cột để sắp xếp
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo
  updatedAt: { type: Date, default: Date.now }, // Thời gian cập nhật
});

module.exports = mongoose.model('Board', boardSchema);