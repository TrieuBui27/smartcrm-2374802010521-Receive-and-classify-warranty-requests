// Lớp truy cập dữ liệu: chỉ chứa SQL tham số hóa, không chứa quy tắc nghiệp vụ.
const pool = require('../db/pool');

const COLS = 'customer_id, full_name, phone, email, address, is_active, created_at';

async function findByPhone(phone) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM customer WHERE phone = $1 AND is_active`, [phone]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM customer WHERE customer_id = $1 AND is_active`, [id]);
  return rows[0] || null;
}

async function findDevices(customerId) {
  const { rows } = await pool.query(
    `SELECT device_id, device_name, serial_no, purchase_date, warranty_months
       FROM device WHERE customer_id = $1 ORDER BY device_id`, [customerId]);
  return rows;
}

async function create({ full_name, phone, email, address }) {
  const { rows } = await pool.query(
    `INSERT INTO customer (full_name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [full_name, phone, email ?? null, address ?? null]);
  return rows[0];
}

async function update(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE customer SET ${sets} WHERE customer_id = $1 AND is_active RETURNING ${COLS}`,
    [id, ...keys.map(k => fields[k])]);
  return rows[0] || null;
}

async function deactivate(id) {
  const { rowCount } = await pool.query(
    'UPDATE customer SET is_active = false WHERE customer_id = $1 AND is_active', [id]);
  return rowCount === 1;
}

module.exports = { findByPhone, findById, findDevices, create, update, deactivate };