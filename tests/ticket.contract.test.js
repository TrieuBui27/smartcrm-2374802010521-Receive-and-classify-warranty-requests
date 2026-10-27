// Test hợp đồng ở ranh giới: kiểm tra HÌNH DẠNG và Ý NGHĨA đặc biệt (null, định dạng ngày, che số) của toTicketView,
// không kiểm tra giá trị nghiệp vụ. Dòng mẫu lấy từ tickets_history.csv (BH-000101/2025) nối với khách và thiết bị.
const test = require('node:test');
const assert = require('node:assert/strict');
const { toTicketView } = require('../src/backend/services/ticket.contract');

const NHAN_VIEN = { role: 'NHAN_VIEN_TIEP_NHAN' };
const QUAN_LY = { role: 'QUAN_LY_TRUNG_TAM' };
const NOW = new Date('2026-09-08T14:30:00+07:00');

const mau = () => ({
  ticket_id: 101, ticket_code: 'BH-000101/2025', status: 'DANG_XU_LY', priority: 'TRUNG_BINH',
  category_name: 'PIN', issue_desc: 'may bi pin chai chỉ còn dùng được nửa ngày', accessories: 'SAC,HOP',
  customer_name: 'Phan Hữu Bình', customer_phone: '0763247885', device_name: 'Samsung Pro Max 14',
  serial_no: 'SN281481716773', center_id: 5, received_at: new Date('2025-09-25T12:00:00+07:00'),
  due_date: new Date('2025-09-28T12:00:00+07:00'), closed_at: null, is_warranty: true, warranty_verified: true,
});

test('hợp đồng luồng đúng: đủ 18 trường, ngày dạng ISO 8601 kèm +07:00', () => {
  const v = toTicketView(mau(), NHAN_VIEN, NOW);
  assert.deepEqual(Object.keys(v).sort(), [
    'accessories', 'category_name', 'center_id', 'closed_at', 'customer_name', 'customer_phone', 'device_name',
    'due_date', 'is_overdue', 'is_warranty', 'issue_desc', 'priority', 'received_at', 'serial_no', 'status',
    'ticket_code', 'ticket_id', 'warranty_verified']);
  assert.equal(v.received_at, '2025-09-25T12:00:00+07:00');
  assert.equal(v.due_date, '2025-09-28T12:00:00+07:00');
  assert.deepEqual(v.accessories, ['SAC', 'HOP']);
});

test('QT-15: Nhân viên tiếp nhận thấy số đã che, Quản lý trung tâm thấy đủ số', () => {
  assert.equal(toTicketView(mau(), NHAN_VIEN, NOW).customer_phone, '076****885');
  assert.equal(toTicketView(mau(), QUAN_LY, NOW).customer_phone, '0763247885');
});

test('dữ liệu thiếu: giá trị tùy chọn trả null hoặc mảng rỗng, không bao giờ undefined', () => {
  const row = { ...mau(), category_name: undefined, accessories: null, customer_name: undefined,
    device_name: undefined, customer_phone: null, closed_at: undefined };
  const v = toTicketView(row, NHAN_VIEN, NOW);
  assert.equal(v.category_name, null);
  assert.deepEqual(v.accessories, []);
  assert.equal(v.customer_name, '(không rõ)');
  assert.equal(v.customer_phone, null);
  assert.equal(v.closed_at, null);
  assert.ok(Object.values(v).every(x => x !== undefined));
});

test('is_overdue: quá hạn khi chưa hoàn tất, không tính khi đã hoàn tất hoặc chưa tới hạn', () => {
  assert.equal(toTicketView(mau(), NHAN_VIEN, NOW).is_overdue, true);
  assert.equal(toTicketView({ ...mau(), status: 'HOAN_TAT' }, NHAN_VIEN, NOW).is_overdue, false);
  assert.equal(toTicketView({ ...mau(), due_date: new Date('2026-09-10T00:00:00+07:00') }, NHAN_VIEN, NOW).is_overdue, false);
});