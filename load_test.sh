#!/bin/bash

# Địa chỉ IP và port của ứng dụng
TARGET_URL="http://192.168.88.31:30003/api/columns"
# TARGET_URL="http://192.168.88.31:30003/api/users/login"
# TARGET_URL="http://192.168.88.31:30003/api/boards"
# TARGET_URL="http://192.168.88.31:30003/api/cards"
# TARGET_URL="http://192.168.88.31:30003/api/invitations/column"
# Số lượng yêu cầu gửi đồng thời trong mỗi batch
CONCURRENT_REQUESTS=200
# Thời gian chạy script tối đa (giây)
DURATION=360  # T= Đủ để hoàn thành 200 batch (~250 giây) + buffer
# Số lần gửi batch yêu cầu
REQUEST_BATCHES=200
# Thời gian chờ tối đa cho mỗi yêu cầu curl (giây)
CURL_TIMEOUT=2

# Hàm gửi yêu cầu curl
send_requests() {
  for ((i=1; i<=CONCURRENT_REQUESTS; i++)); do
    # Gửi yêu cầu curl trong nền, ghi lỗi nếu có
    curl -s -o /dev/null --max-time $CURL_TIMEOUT "$TARGET_URL" || echo "Yêu cầu $i trong batch $batch_count thất bại" >> load_test_errors.log &
  done
  # Chờ tất cả yêu cầu trong batch hoàn tất
  wait
}

# Biến đếm số batch đã gửi
batch_count=0

# Xóa file log lỗi cũ (nếu có)
> load_test_errors.log

# Chạy trong khoảng thời gian xác định hoặc đến khi đạt số batch yêu cầu
END_TIME=$((SECONDS+DURATION))
echo "Bắt đầu gửi yêu cầu. Mục tiêu: 40,000 yêu cầu (~$REQUEST_BATCHES batch, $CONCURRENT_REQUESTS yêu cầu/batch)."
while [ $SECONDS -lt $END_TIME ] && [ $batch_count -lt $REQUEST_BATCHES ]; do
  send_requests
  # Tăng biến đếm batch
  ((batch_count++))
  echo "Hoàn tất batch $batch_count/$REQUEST_BATCHES"
  # Nghỉ 0.1 giây để tránh quá tải
  sleep 0.1
done

# Báo cáo kết quả
echo "Hoàn tất gửi yêu cầu. Tổng cộng $batch_count batch đã gửi (~$((batch_count*CONCURRENT_REQUESTS)) yêu cầu)."
if [ -s load_test_errors.log ]; then
  echo "Có lỗi trong quá trình gửi yêu cầu. Kiểm tra load_test_errors.log để biết chi tiết."
else
  echo "Không ghi nhận lỗi trong quá trình gửi yêu cầu."
fi
echo "Kiểm tra trạng thái auto-scaling trong Kubernetes."