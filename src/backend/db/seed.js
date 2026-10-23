// Nạp dữ liệu mẫu từ seeds/*.csv. Dùng ON CONFLICT DO NOTHING nên chạy lại không nhân đôi dữ liệu.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const pool = require('./pool');
const { normalizePhone } = require('../services/phone');

const DIR = path.join(__dirname, '../../../seeds');
const read = f => parse(fs.readFileSync(path.join(DIR, f), 'utf8'), { columns: true, skip_empty_lines: true });
const orNull = v => (v === undefined || v === '' ? null : v);

async function seedIssueCategory() {
  let added = 0;
  for (const r of read('issue_category.csv')) {
    const res = await pool.query(
      `INSERT INTO issue_category (category_name, keywords, default_priority)
       VALUES ($1, $2, $3) ON CONFLICT (category_name) DO NOTHING`,
      [r.category_name, orNull(r.keywords), r.default_priority]);
    added += res.rowCount;
  }
  return { added };
}

async function seedEmployee() {
  let added = 0;
  for (const r of read('employee.csv')) {
    const res = await pool.query(
      `INSERT INTO employee (employee_id, full_name, role, center_id)
       VALUES ($1, $2, $3, $4) ON CONFLICT (employee_id) DO NOTHING`,
      [r.employee_id, r.full_name, r.role, r.center_id]);
    added += res.rowCount;
  }
  // Dữ liệu có sẵn mã nên phải đẩy sequence lên, tránh trùng khóa khi thêm nhân viên mới.
  await pool.query(`SELECT setval(pg_get_serial_sequence('employee','employee_id'),
                    (SELECT COALESCE(MAX(employee_id), 1) FROM employee))`);
  return { added };
}

async function seedCustomer() {
  // customer.csv giữ nguyên số điện thoại thô của bộ dữ liệu; chuẩn hóa bằng đúng hàm QT-02 của service.
  let added = 0, skipped = 0;
  for (const r of read('customer.csv')) {
    const phone = normalizePhone(r.so_dien_thoai);
    if (!phone) { skipped++; continue; }
    const res = await pool.query(
      `INSERT INTO customer (full_name, phone, email, address)
       VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO NOTHING`,
      [r.ho_ten.trim(), phone, orNull(r.email), orNull(r.dia_chi)]);
    added += res.rowCount;
  }
  return { added, skipped };
}

async function main() {
  for (const [name, fn] of [['issue_category', seedIssueCategory], ['employee', seedEmployee], ['customer', seedCustomer]]) {
    const r = await fn();
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${name}`);
    const extra = r.skipped !== undefined ? `, bỏ qua ${r.skipped} dòng số điện thoại không hợp lệ` : '';
    console.log(`${name.padEnd(15)} thêm mới ${r.added}${extra}; tổng ${rows[0].n} dòng`);
  }
}

main()
  .catch(err => { console.error('Seed lỗi:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());