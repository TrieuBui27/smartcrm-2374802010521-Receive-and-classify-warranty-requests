const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });
const { Pool, types } = require('pg');
const { logger } = require('../logger');

// BIGINT (mã 20) mặc định trả về chuỗi; đổi sang số để customer_id, device_id là số như hợp đồng API.
types.setTypeParser(20, v => Number(v));
// Cột TIMESTAMP không có múi giờ: hệ thống quy ước lưu GIỜ VIỆT NAM (khớp bộ dữ liệu và now() của phiên làm việc
// bên dưới). Đọc ra thì gắn +07:00 để thành thời điểm thật; gửi vào thì dùng toDbTime() trong repository.
types.setTypeParser(1114, v => new Date(v.replace(' ', 'T') + '+07:00'));
// Một pool dùng chung cho toàn bộ backend; thông số lấy từ .env (xem .env.example).
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: '-c TimeZone=Asia/Ho_Chi_Minh', // now() và DEFAULT now() trả giờ Việt Nam
  connectionTimeoutMillis: 5000, // CSDL không trả lời thì báo lỗi sau 5 giây, không treo yêu cầu
  query_timeout: 15000,
});

// BUG-002: kết nối đang rảnh trong pool bị CSDL cắt (tắt hoặc khởi động lại PostgreSQL) phát sự kiện 'error'.
// Không có hàm nghe thì Node coi là lỗi chưa xử lý và tắt cả backend. Pool tự bỏ kết nối hỏng và mở kết nối
// mới ở yêu cầu sau, nên ở đây chỉ cần ghi log.
pool.on('error', err => logger.warn('mất một kết nối CSDL đang rảnh, pool sẽ kết nối lại', { err }));

module.exports = pool;