// Buổi 14 (BT3), tầng INTEGRATION: TC-09, TC-10, TC-11 chạy service THẬT + repository THẬT + PostgreSQL thật.
// Cần đã chạy db:migrate và db:seed; không có CSDL thì bỏ qua. Dữ liệu tự tạo, xóa sạch ở cuối mỗi test.
const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/backend/db/pool');
const ticketRepo = require('../src/backend/repositories/ticket.repository');
const deviceRepo = require('../src/backend/repositories/device.repository');
const { createTicketService } = require('../src/backend/services/ticket.service');
const { createDeviceService } = require('../src/backend/services/device.service');

const dbReady = async () => { try { await pool.query('SELECT 1 FROM ticket LIMIT 1'); return true; } catch { return false; } };
const STAFF = { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 };

async function newCustomer(tag) {
  const { rows: [c] } = await pool.query(
    `INSERT INTO customer (full_name, phone) VALUES ($1, $2) RETURNING customer_id`,
    [`TC khach ${tag}`, `09${String(Date.now()).slice(-8)}`]);
  return c.customer_id;
}
async function cleanup(customerId) {
  await pool.query('DELETE FROM ticket_status_log WHERE ticket_id IN (SELECT ticket_id FROM ticket WHERE customer_id = $1)', [customerId]);
  await pool.query('DELETE FROM ticket WHERE customer_id = $1', [customerId]);
  await pool.query('DELETE FROM device WHERE customer_id = $1', [customerId]);
  await pool.query('DELETE FROM customer WHERE customer_id = $1', [customerId]);
}

// TC-09 bảo mật/chất lượng dữ liệu: khách đã xóa mềm (QT-13) không được lập phiếu mới.
test('TC-09 khách đã xóa mềm không lập được phiếu bảo hành mới', async t => {
  if (!(await dbReady())) return t.skip('Chưa có CSDL smartcrm');
  const customerId = await newCustomer('xoa mem');
  try {
    const { rows: [d] } = await pool.query(
      `INSERT INTO device (customer_id, device_name, serial_no, purchase_date, warranty_months)
       VALUES ($1, 'May TC-09', 'TC09-SN-0001', '2026-03-05', 12) RETURNING device_id`, [customerId]);
    await pool.query('UPDATE customer SET is_active = false WHERE customer_id = $1', [customerId]); // xóa mềm
    const service = createTicketService(ticketRepo);
    await assert.rejects(
      () => service.create({ customer_id: customerId, device_id: d.device_id, issue_desc: 'man hinh bi vo sau khi roi' }, STAFF),
      err => ['CUSTOMER_NOT_FOUND', 'NOT_FOUND'].includes(err.code));
    const { rows } = await pool.query('SELECT 1 FROM ticket WHERE customer_id = $1', [customerId]);
    assert.equal(rows.length, 0, 'không được có phiếu nào lưu cho khách đã xóa');
  } finally { await cleanup(customerId); }
});

// TC-10 tái lập BUG-003: ngày mua ghi vào rồi đọc ra phải giữ nguyên, không lùi một ngày.
test('TC-10 tái lập BUG-003: ngày mua 2026-11-06 đọc lại vẫn là 2026-11-06', async t => {
  if (!(await dbReady())) return t.skip('Chưa có CSDL smartcrm');
  const customerId = await newCustomer('ngay mua');
  try {
    const service = createDeviceService(deviceRepo, { today: () => '2026-11-06' });
    const created = await service.create(customerId, {
      device_name: 'May TC-10', serial_no: 'TC10-SN-0001', purchase_date: '2026-11-06', warranty_months: 12 });
    assert.equal(created.purchase_date, '2026-11-06');
    const again = await service.getById(created.device_id);
    assert.equal(again.purchase_date, '2026-11-06');
    assert.equal(JSON.parse(JSON.stringify(again)).purchase_date, '2026-11-06'); // đúng cả sau khi đổi sang JSON
  } finally { await cleanup(customerId); }
});

// TC-11 dữ liệu sai: QT-03, serial trùng chỉ khác hoa/thường vẫn là trùng.
test('TC-11 serial "tc11-sn-0001" trùng "TC11-SN-0001" chỉ khác hoa thường phải bị từ chối', async t => {
  if (!(await dbReady())) return t.skip('Chưa có CSDL smartcrm');
  const customerId = await newCustomer('serial');
  try {
    const service = createDeviceService(deviceRepo, { today: () => '2026-11-06' });
    await service.create(customerId, { device_name: 'May A', serial_no: 'TC11-SN-0001', warranty_months: 12 });
    await assert.rejects(
      () => service.create(customerId, { device_name: 'May B', serial_no: 'tc11-sn-0001', warranty_months: 12 }),
      err => err.code === 'SERIAL_EXISTS' && /Serial\/IMEI đã thuộc một thiết bị khác/.test(err.message));
    const { rows } = await pool.query('SELECT 1 FROM device WHERE customer_id = $1', [customerId]);
    assert.equal(rows.length, 1, 'chỉ được có một thiết bị');
  } finally { await cleanup(customerId); }
});