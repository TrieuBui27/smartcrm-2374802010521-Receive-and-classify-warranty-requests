// Truy cập bảng employee cho đăng nhập: chỉ đọc, không bao giờ trả mật khẩu ra ngoài lớp service.
const pool = require('../db/pool');

async function findByUsername(username) {
  const { rows } = await pool.query(
    `SELECT employee_id, username, password_hash, full_name, role, center_id, is_active
       FROM employee WHERE username = $1`, [username]);
  return rows[0] || null;
}

// BUG-004: mỗi yêu cầu có token phải kiểm lại tài khoản còn hoạt động và vai trò hiện tại, không tin riêng nội dung token.
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT employee_id, full_name, role, center_id, is_active FROM employee WHERE employee_id = $1`, [id]);
  return rows[0] || null;
}

module.exports = { findByUsername, findById };