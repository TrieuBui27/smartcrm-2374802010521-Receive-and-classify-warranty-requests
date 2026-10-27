// Kiểm thử repository phiếu trên PostgreSQL thật: chỉ mục ux_ticket_device_open (UC3 8a) và UPDATE có điều kiện
// (UC7 4b) chỉ chứng minh được trên CSDL thật. Cần đã chạy db:migrate và db:seed; không có CSDL thì bỏ qua.
// Dữ liệu tạo ra được xóa sạch ở cuối, không đụng tới dữ liệu seed.
const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/backend/db/pool');
const repo = require('../src/backend/repositories/ticket.repository');

const SERIAL = 'TEST-REPO-SN281481716773';

async function dbReady() {
  try { await pool.query('SELECT 1 FROM ticket LIMIT 1'); return true; } catch { return false; }
}

function ticketInput(deviceId, customerId) {
  return {
    customer_id: customerId, device_id: deviceId, center_id: 1,
    issue_desc: 'may bi pin chai chỉ còn dùng được nửa ngày', accessories: null, category_id: 2,
    priority: 'TRUNG_BINH', received_by: 2, received_at: new Date('2026-09-08T14:30:00+07:00'),
    due_date: new Date('2026-09-11T14:30:00+07:00'), is_warranty: true, warranty_verified: true,
  };
}

test('repository phiếu trên CSDL thật: 8a và 4b', async t => {
  if (!(await dbReady())) { t.skip('Chưa có CSDL smartcrm (chạy npm run db:migrate và db:seed)'); return; }
  const { rows: [customer] } = await pool.query('SELECT customer_id FROM customer ORDER BY customer_id LIMIT 1');
  const { rows: [device] } = await pool.query(
    `INSERT INTO device (customer_id, device_name, serial_no, purchase_date, warranty_months)
     VALUES ($1, 'Máy thử nghiệm', $2, '2026-03-05', 12) RETURNING device_id`, [customer.customer_id, SERIAL]);
  try {
    // 8a: hai yêu cầu cùng lúc cho một thiết bị, chỉ mục duy nhất chỉ cho một yêu cầu thành công.
    const results = await Promise.all([
      repo.createWithLog(ticketInput(device.device_id, customer.customer_id), 2),
      repo.createWithLog(ticketInput(device.device_id, customer.customer_id), 2),
    ]);
    const saved = results.filter(Boolean);
    assert.equal(saved.length, 1);
    assert.match(saved[0].ticket_code, /^BH-\d{6}\/2026$/);
    assert.equal(saved[0].status, 'MOI');
    assert.equal(saved[0].due_date.toISOString(), new Date('2026-09-11T14:30:00+07:00').toISOString()); // giờ VN đọc ra đúng
    const { rows: logs } = await pool.query('SELECT * FROM ticket_status_log WHERE ticket_id = $1', [saved[0].ticket_id]);
    assert.equal(logs.length, 1);                                       // giao dịch thua không để lại nhật ký mồ côi
    assert.equal((await repo.findOpenTicketByDevice(device.device_id)).ticket_code, saved[0].ticket_code);

    // 4b: hai người cùng đổi từ MOI, chỉ một câu UPDATE có điều kiện thành công và chỉ có một dòng nhật ký.
    const id = saved[0].ticket_id;
    const moves = await Promise.all([
      repo.updateStatusIfCurrent(id, 'MOI', 'DA_PHAN_CONG', 1, 'Phân công'),
      repo.updateStatusIfCurrent(id, 'MOI', 'DA_HUY', 1, 'Hủy'),
    ]);
    assert.equal(moves.filter(Boolean).length, 1);
    const { rows: logs2 } = await pool.query('SELECT * FROM ticket_status_log WHERE ticket_id = $1', [id]);
    assert.equal(logs2.length, 2);
  } finally {
    await pool.query('DELETE FROM ticket_status_log WHERE ticket_id IN (SELECT ticket_id FROM ticket WHERE device_id = $1)', [device.device_id]);
    await pool.query('DELETE FROM ticket WHERE device_id = $1', [device.device_id]);
    await pool.query('DELETE FROM device WHERE device_id = $1', [device.device_id]);
  }
});

test.after(() => pool.end());