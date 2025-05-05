# Sử dụng image Node.js phiên bản 20 với Alpine để tối ưu kích thước
FROM node:20-alpine

# Tạo thư mục /app và thiết lập quyền sở hữu cho user node để tăng cường bảo mật
RUN mkdir -p /app && chown -R node:node /app

# Thiết lập thư mục làm việc là /app
WORKDIR /app

# Sao chép package.json và package-lock.json (nếu có) vào thư mục làm việc,
# đồng thời thiết lập quyền sở hữu cho user node
COPY --chown=node:node package*.json ./

# Chuyển sang user node để thực hiện các lệnh tiếp theo dưới quyền user không phải root
USER node

# Cài đặt dependencies bằng npm install
RUN npm install

# Sao chép toàn bộ mã nguồn ứng dụng vào thư mục làm việc,
# đảm bảo quyền sở hữu thuộc về user node
COPY --chown=node:node . .

# Công bố cổng 3001 mà ứng dụng sẽ lắng nghe
EXPOSE 3005

# Chạy ứng dụng bằng lệnh npm start
CMD ["npm", "start"]