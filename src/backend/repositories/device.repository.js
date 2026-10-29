// Lớp truy cập dữ liệu thiết bị: chỉ chứa SQL tham số hóa, không chứa quy tắc nghiệp vụ.
const pool = require('../db/pool');

const COLS = 'device_id, customer_id, device_name, serial_no, purchase_date, warranty_months';

async function customerExists(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM customer WHERE customer_id = $1 AND is_active', [id]);
  return rowCount === 1;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM device WHERE device_id = $1`, [id]);
  return rows[0] || null;
}

async function findBySerial(serial) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM device WHERE serial_no = $1`, [serial]);
  return rows[0] || null;
}

// Serial đã có (QT-03, ràng buộc UNIQUE) thì không thêm và trả null, kể cả khi hai yêu cầu gửi cùng lúc.
async function create(customerId, { device_name, serial_no, purchase_date, warranty_months }) {
  const { rows } = await pool.query(
    `INSERT INTO device (customer_id, device_name, serial_no, purchase_date, warranty_months)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (serial_no) DO NOTHING RETURNING ${COLS}`,
    [customerId, device_name, serial_no, purchase_date ?? null, warranty_months]);
  return rows[0] || null;
}

async function update(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE device SET ${sets} WHERE device_id = $1 RETURNING ${COLS}`, [id, ...keys.map(k => fields[k])]);
  return rows[0] || null;
}

async function countTickets(id) {
  const { rows: [{ n }] } = await pool.query('SELECT COUNT(*)::int AS n FROM ticket WHERE device_id = $1', [id]);
  return n;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM device WHERE device_id = $1', [id]);
  return rowCount === 1;
}

module.exports = { customerExists, findById, findBySerial, create, update, countTickets, remove };