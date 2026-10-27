// Nạp dữ liệu mẫu từ seeds/*.csv. Dùng ON CONFLICT DO NOTHING nên chạy lại không nhân đôi dữ liệu.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
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
  // Mọi tài khoản mẫu dùng chung một mật khẩu thử nghiệm (đổi bằng biến SEED_PASSWORD); chỉ lưu bản băm bcrypt.
  const password = process.env.SEED_PASSWORD || 'Mekong@2026';
  let added = 0;
  for (const r of read('employee.csv')) {
    // Nhân viên đã có từ buổi 8 thì chỉ bổ sung tên đăng nhập và mật khẩu khi chưa có; chạy lại không đổi gì.
    const res = await pool.query(
      `INSERT INTO employee (employee_id, username, password_hash, full_name, role, center_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (employee_id) DO UPDATE
         SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash
         WHERE employee.password_hash IS NULL`,
      [r.employee_id, r.username, await bcrypt.hash(password, 10), r.full_name, r.role, r.center_id]);
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

// Tìm khách theo số điện thoại thô của seeds/customer.csv, chuẩn hóa bằng cùng hàm QT-02 lúc nạp customer.
async function customerIdByRawPhone(raw) {
  const phone = normalizePhone(raw);
  if (!phone) return null;
  const { rows } = await pool.query('SELECT customer_id FROM customer WHERE phone = $1', [phone]);
  return rows[0] ? rows[0].customer_id : null;
}

async function employeeIdOfCenter(centerId, role) {
  const { rows } = await pool.query('SELECT employee_id FROM employee WHERE center_id = $1 AND role = $2 ORDER BY employee_id LIMIT 1', [centerId, role]);
  return rows[0].employee_id;
}

async function seedDevice() {
  let added = 0, skipped = 0;
  for (const r of read('device.csv')) {
    const customerId = await customerIdByRawPhone(r.so_dien_thoai);
    if (!customerId) { skipped++; continue; }
    const res = await pool.query(
      `INSERT INTO device (customer_id, device_name, serial_no, purchase_date, warranty_months)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (serial_no) DO NOTHING`,
      [customerId, r.device_name, r.serial_no, orNull(r.purchase_date), r.warranty_months]);
    added += res.rowCount;
  }
  return { added, skipped };
}

async function seedTicket() {
  // Giữ nguyên ticket_id và ticket_code của bộ dữ liệu; thời điểm là giờ Việt Nam, khớp quy ước ở db/pool.js.
  let added = 0;
  for (const r of read('ticket.csv')) {
    const { rows: [device] } = await pool.query('SELECT device_id, customer_id FROM device WHERE serial_no = $1', [r.serial_no]);
    const receivedBy = await employeeIdOfCenter(r.center_id, 'NHAN_VIEN_TIEP_NHAN');
    const res = await pool.query(
      `INSERT INTO ticket (ticket_id, ticket_code, customer_id, device_id, center_id, issue_desc, category_id, priority,
                           status, received_by, received_at, due_date, closed_at, is_warranty, is_overdue)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, COALESCE($13::timestamp, now()) > $12::timestamp)
       ON CONFLICT (ticket_id) DO NOTHING`,
      [r.ticket_id, r.ticket_code, device.customer_id, device.device_id, r.center_id, r.issue_desc, r.category_id,
       r.priority, r.status, receivedBy, r.received_at, r.due_date, orNull(r.closed_at), r.is_warranty === 'true']);
    added += res.rowCount;
  }
  // Đã nạp ticket_id có sẵn nên phải đẩy sequence lên, tránh trùng khóa khi tạo phiếu mới.
  await pool.query(`SELECT setval(pg_get_serial_sequence('ticket','ticket_id'), (SELECT COALESCE(MAX(ticket_id), 1) FROM ticket))`);
  return { added };
}

async function seedTicketStatusLog() {
  // changed_by của bộ dữ liệu là kỹ thuật viên (luồng L4). Ở L2 người đổi trạng thái là nhân viên tiếp nhận
  // (dòng đầu tiên) hoặc Quản lý trung tâm cập nhật thay kỹ thuật viên (A4).
  let added = 0;
  for (const r of read('ticket_status_log.csv')) {
    const { rows: [t] } = await pool.query('SELECT center_id FROM ticket WHERE ticket_id = $1', [r.ticket_id]);
    if (!t) continue;
    const by = await employeeIdOfCenter(t.center_id, r.from_status ? 'QUAN_LY_TRUNG_TAM' : 'NHAN_VIEN_TIEP_NHAN');
    const res = await pool.query(
      `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_at, changed_by)
       SELECT $1::bigint, $2::varchar, $3::varchar, $4::timestamp, $5::bigint
        WHERE NOT EXISTS (SELECT 1 FROM ticket_status_log
                           WHERE ticket_id = $1::bigint AND to_status = $3::varchar AND changed_at = $4::timestamp)`,
      [r.ticket_id, orNull(r.from_status), r.to_status, r.changed_at, by]);
    added += res.rowCount;
  }
  return { added };
}

async function main() {
  for (const [name, fn] of [['issue_category', seedIssueCategory], ['employee', seedEmployee], ['customer', seedCustomer],
    ['device', seedDevice], ['ticket', seedTicket], ['ticket_status_log', seedTicketStatusLog]]) {
    const r = await fn();
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${name}`);
    const extra = r.skipped !== undefined ? `, bỏ qua ${r.skipped} dòng (số điện thoại không hợp lệ hoặc không nối được với khách)` : '';
    console.log(`${name.padEnd(18)} thêm mới ${r.added}${extra}; tổng ${rows[0].n} dòng`);
  }
}

main()
  .catch(err => { console.error('Seed lỗi:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());