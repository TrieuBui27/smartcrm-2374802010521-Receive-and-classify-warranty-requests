// Kiểm thử TicketService cho các luồng ngoại lệ dễ sai nhất của UC3 và UC7 (TD-08).
// Viết TRƯỚC khi có ticket.service.js: repository giả dưới đây chính là hợp đồng mà service phải dùng.
// Dữ liệu lấy từ tickets_history.csv của bộ dữ liệu Mekong Mobile (serial, mô tả lỗi, mã phiếu).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createTicketService } = require('../src/backend/services/ticket.service');

const NHAN_VIEN = { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 };
const QUAN_LY = { employee_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 };
// Thứ Ba 08/09/2026 14:30 giờ Việt Nam, cố định để hạn cam kết không phụ thuộc lúc chạy test.
const NOW = () => new Date('2026-09-08T14:30:00+07:00');

const CATEGORIES = [
  { category_id: 2, category_name: 'PIN', keywords: 'pin,hao pin,chai pin', default_priority: 'TRUNG_BINH' },
  { category_id: 6, category_name: 'KHAC', keywords: null, default_priority: 'THAP' },
];

// Repository giả giữ dữ liệu trong bộ nhớ. Mỗi hàm trả bản sao để mô phỏng việc đọc từ CSDL.
function fakeRepo({ devices = [], tickets = [], raceOnInsert = false } = {}) {
  const logs = [];
  const copy = r => (r ? { ...r } : null);
  const isOpen = t => !['DA_DONG', 'DA_HUY'].includes(t.status);
  return {
    tickets, logs,
    async findDeviceById(id) { return copy(devices.find(d => d.device_id === Number(id))); },
    async findOpenTicketByDevice(deviceId) {
      return copy(tickets.find(t => t.device_id === Number(deviceId) && isOpen(t)));
    },
    async findActiveCategories() { return CATEGORIES; },
    // raceOnInsert: mô phỏng 8a – lúc kiểm tra chưa có phiếu mở, nhưng một yêu cầu khác đã lưu trước
    // nên chỉ mục ux_ticket_device_open từ chối; repository trả null thay vì ném lỗi CSDL.
    async createWithLog(t) {
      if (raceOnInsert) {
        tickets.push({ ticket_id: 7001, ticket_code: 'BH-007001/2026', device_id: t.device_id, status: 'MOI' });
        return null;
      }
      const row = { ticket_id: tickets.length + 1, ticket_code: 'BH-000999/2026', status: 'MOI', ...t };
      tickets.push(row);
      logs.push({ ticket_id: row.ticket_id, from_status: null, to_status: 'MOI' });
      return copy(row);
    },
    async findById(id) { return copy(tickets.find(t => t.ticket_id === Number(id))); },
    // Giống câu UPDATE ... WHERE status = $from: chỉ đổi khi trạng thái hiện tại vẫn là trạng thái đã đọc.
    async updateStatusIfCurrent(id, from, to, employeeId, note) {
      const t = tickets.find(x => x.ticket_id === Number(id));
      if (!t || t.status !== from) return null;
      t.status = to;
      const log = { ticket_id: t.ticket_id, from_status: from, to_status: to, changed_by: employeeId, note };
      logs.push(log);
      return { ticket: copy(t), log };
    },
  };
}

const DEVICE = { device_id: 1, customer_id: 89, serial_no: 'SN281481716773', purchase_date: '2026-03-05', warranty_months: 12 };
const INPUT = { customer_id: 89, device_id: 1, issue_desc: 'may bi pin chai chỉ còn dùng được nửa ngày' };

test('UC3 luồng đúng: tạo phiếu Mới, đề xuất nhóm PIN, hạn cam kết 72 giờ', async () => {
  const repo = fakeRepo({ devices: [DEVICE] });
  const t = await createTicketService(repo, { now: NOW }).create(INPUT, NHAN_VIEN);
  assert.equal(t.status, 'MOI');
  assert.equal(t.category_id, 2);
  assert.equal(t.priority, 'TRUNG_BINH');
  assert.equal(t.is_warranty, true);
  assert.equal(t.center_id, 1);                                        // lấy trung tâm của người tạo
  assert.equal(new Date(t.due_date).toISOString(), new Date('2026-09-11T14:30:00+07:00').toISOString());
  assert.equal(repo.logs.length, 1);
});

test('UC3 6a: thiết bị đang có phiếu chưa đóng thì 409 kèm mã phiếu cũ, không lưu', async () => {
  const repo = fakeRepo({
    devices: [DEVICE],
    tickets: [{ ticket_id: 101, ticket_code: 'BH-000101/2025', device_id: 1, center_id: 1, status: 'DANG_XU_LY' }],
  });
  await assert.rejects(createTicketService(repo, { now: NOW }).create(INPUT, NHAN_VIEN),
    { code: 'DEVICE_HAS_OPEN_TICKET', details: { open_ticket_code: 'BH-000101/2025' } });
  assert.equal(repo.tickets.length, 1);
  assert.equal(repo.logs.length, 0);
});

test('UC3 8a: hai yêu cầu đồng thời, chỉ mục duy nhất chặn yêu cầu sau thì xử lý như 6a', async () => {
  const repo = fakeRepo({ devices: [DEVICE], raceOnInsert: true });
  await assert.rejects(createTicketService(repo, { now: NOW }).create(INPUT, NHAN_VIEN),
    { code: 'DEVICE_HAS_OPEN_TICKET', details: { open_ticket_code: 'BH-007001/2026' } });
  assert.equal(repo.logs.length, 0);
});

test('UC7 3a: Hoàn tất quay lại Đang xử lý thì 422 INVALID_TRANSITION, dữ liệu giữ nguyên', async () => {
  const repo = fakeRepo({ tickets: [{ ticket_id: 5, ticket_code: 'BH-000005/2026', device_id: 1, center_id: 1, status: 'HOAN_TAT' }] });
  await assert.rejects(createTicketService(repo).changeStatus(5, { to_status: 'DANG_XU_LY' }, QUAN_LY),
    { code: 'INVALID_TRANSITION' });
  assert.equal(repo.tickets[0].status, 'HOAN_TAT');
  assert.equal(repo.logs.length, 0);
});

test('UC7 4b: hai người đổi trạng thái cùng lúc thì chỉ một yêu cầu thành công, yêu cầu kia 422', async () => {
  const repo = fakeRepo({ tickets: [{ ticket_id: 5, ticket_code: 'BH-000005/2026', device_id: 1, center_id: 1, status: 'DANG_XU_LY' }] });
  const svc = createTicketService(repo);
  const results = await Promise.allSettled([
    svc.changeStatus(5, { to_status: 'HOAN_TAT' }, QUAN_LY),
    svc.changeStatus(5, { to_status: 'CHO_LINH_KIEN' }, QUAN_LY),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), ['fulfilled', 'rejected']);
  assert.equal(results.find(r => r.status === 'rejected').reason.code, 'INVALID_TRANSITION');
  assert.equal(repo.logs.length, 1);
});