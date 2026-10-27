// Kiểm thử phần ĐỌC của TicketService: danh sách, chi tiết, phạm vi trung tâm (QT-14), che số điện thoại (QT-15).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTicketService } = require('../src/backend/services/ticket.service');

const NHAN_VIEN = { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 };
const QUAN_LY = { employee_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 };
const NOW = () => new Date('2026-09-08T14:30:00+07:00');

// Dòng đã nối khách, thiết bị, nhóm sự cố, đúng như repository.list / findViewById trả về.
const ROW = {
  ticket_id: 231, ticket_code: 'BH-000231/2025', status: 'DANG_XU_LY', priority: 'CAO', category_name: 'MAN_HINH',
  issue_desc: 'may bi màn hình bị sọc dọc bị từ tuần trước', accessories: null, customer_name: 'Nguyễn Văn An',
  customer_phone: '0901234567', device_name: 'Apple Lite9', serial_no: 'SN290576547180', center_id: 1,
  received_at: new Date('2026-09-07T16:30:00+07:00'), due_date: new Date('2026-09-08T16:30:00+07:00'), closed_at: null,
  is_warranty: true, warranty_verified: true,
};
const LOG = [
  { from_status: null, to_status: 'MOI', changed_at: new Date('2026-09-07T16:30:00+07:00'), changed_by_name: 'Nhân viên TT01', note: 'Tiếp nhận phiếu' },
  { from_status: 'MOI', to_status: 'DA_PHAN_CONG', changed_at: new Date('2026-09-08T08:14:00+07:00'), changed_by_name: 'Quản lý TT01', note: null },
];

function fakeRepo(rows = [ROW]) {
  const calls = {};
  return {
    calls,
    async list(filters) { calls.list = filters; return { rows, total: rows.length }; },
    async findViewById(id) { return rows.find(r => r.ticket_id === Number(id)) || null; },
    async findLog() { return LOG; },
  };
}

test('danh sách luồng đúng: trả items đúng hợp đồng, che số điện thoại với Nhân viên, kèm page, size, total', async () => {
  const out = await createTicketService(fakeRepo(), { now: NOW }).list({ page: 1, size: 20 }, NHAN_VIEN);
  assert.equal(out.total, 1);
  assert.equal(out.items[0].customer_phone, '090****567');
  assert.equal(out.items[0].due_date, '2026-09-08T16:30:00+07:00');
  assert.deepEqual([out.page, out.size], [1, 20]);
});

test('QT-14: danh sách luôn lọc theo trung tâm của người xem; xin trung tâm khác thì FORBIDDEN', async () => {
  const repo = fakeRepo();
  const svc = createTicketService(repo, { now: NOW });
  await svc.list({ page: 1, size: 20, status: 'MOI', overdue: true }, QUAN_LY);
  assert.deepEqual(repo.calls.list, { center_id: 1, status: 'MOI', overdue: true, page: 1, size: 20 });
  await assert.rejects(svc.list({ page: 1, size: 20, center_id: 2 }, QUAN_LY), { code: 'FORBIDDEN' });
});

test('chi tiết: Quản lý thấy đủ số, có status_log đúng thứ tự; phiếu không có thì NOT_FOUND; trung tâm khác thì FORBIDDEN', async () => {
  const svc = createTicketService(fakeRepo([ROW, { ...ROW, ticket_id: 232, center_id: 2 }]), { now: NOW });
  const t = await svc.getView(231, QUAN_LY);
  assert.equal(t.customer_phone, '0901234567');
  assert.deepEqual(t.status_log.map(l => l.to_status), ['MOI', 'DA_PHAN_CONG']);
  assert.equal(t.status_log[0].changed_at, '2026-09-07T16:30:00+07:00');
  assert.equal(t.status_log[0].from_status, null);
  await assert.rejects(svc.getView(999, QUAN_LY), { code: 'NOT_FOUND' });
  await assert.rejects(svc.getView(232, QUAN_LY), { code: 'FORBIDDEN' });
});