const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { Pool, types } = require('pg');

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
});

module.exports = pool;