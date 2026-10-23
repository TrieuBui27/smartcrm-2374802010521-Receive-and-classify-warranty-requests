const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { Pool, types } = require('pg');

// BIGINT (mã 20) mặc định trả về chuỗi; đổi sang số để customer_id, device_id là số như hợp đồng API.
types.setTypeParser(20, v => Number(v));
// Một pool dùng chung cho toàn bộ backend; thông số lấy từ .env (xem .env.example).
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;