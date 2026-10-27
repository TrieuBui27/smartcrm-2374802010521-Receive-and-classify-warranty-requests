// Kiểm thử bộ kiểm tra dữ liệu vào của POST /api/tickets, POST /api/tickets/suggestion và PATCH /api/tickets/:id/status
// theo bảng validation (docs/api-contract.md mục 4): luồng đúng, giá trị biên, dữ liệu sai.
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCreate, validateSuggestion, validateStatusChange } = require('../src/backend/validators/ticket.validator');

const OK = { customer_id: 89, device_id: 1, issue_desc: 'may bi pin chai chỉ còn dùng được nửa ngày' };

test('POST tạo phiếu luồng đúng: chỉ cần 3 trường bắt buộc; trường tùy chọn để null cũng hợp lệ', () => {
  assert.deepEqual(validateCreate(OK), {});
  assert.deepEqual(validateCreate({ ...OK, center_id: null, category_id: null, priority: null, accessories: ['SAC', 'HOP'] }), {});
});

test('giá trị biên: issue_desc đúng 10 và 2000 ký tự thì nhận, 9 và 2001 thì từ chối; khoảng trắng đầu cuối không tính', () => {
  assert.deepEqual(validateCreate({ ...OK, issue_desc: 'a'.repeat(10) }), {});
  assert.deepEqual(validateCreate({ ...OK, issue_desc: 'a'.repeat(2000) }), {});
  assert.ok(validateCreate({ ...OK, issue_desc: 'a'.repeat(9) }).issue_desc);
  assert.ok(validateCreate({ ...OK, issue_desc: 'a'.repeat(2001) }).issue_desc);
  assert.ok(validateCreate({ ...OK, issue_desc: '   ngắn      ' }).issue_desc);
});

test('dữ liệu sai: thiếu trường bắt buộc, id không phải số nguyên dương, ưu tiên và phụ kiện lạ đều báo đúng trường', () => {
  assert.deepEqual(Object.keys(validateCreate({})).sort(), ['customer_id', 'device_id', 'issue_desc']);
  const e = validateCreate({ customer_id: '1', device_id: -3, issue_desc: 'mô tả đủ dài rồi', priority: 'KHAN', accessories: ['SAC', 'XE'], category_id: 0, center_id: 1.5 });
  assert.deepEqual(Object.keys(e).sort(), ['accessories', 'category_id', 'center_id', 'customer_id', 'device_id', 'priority']);
  assert.ok(validateCreate({ ...OK, accessories: 'SAC' }).accessories);
  assert.deepEqual(Object.keys(validateCreate(null)).sort(), ['customer_id', 'device_id', 'issue_desc']);
});

test('suggestion và đổi trạng thái: issue_desc 10–2000 ký tự; to_status thuộc 7 trạng thái; note tối đa 255 ký tự', () => {
  assert.deepEqual(validateSuggestion({ issue_desc: 'màn hình bị sọc dọc' }), {});
  assert.ok(validateSuggestion({}).issue_desc);
  assert.deepEqual(validateStatusChange({ to_status: 'DANG_XU_LY', note: 'Bắt đầu kiểm tra' }), {});
  assert.deepEqual(validateStatusChange({ to_status: 'DA_DONG' }), {});
  assert.ok(validateStatusChange({ to_status: 'XOA' }).to_status);
  assert.ok(validateStatusChange({}).to_status);
  assert.equal(validateStatusChange({ to_status: 'DA_DONG', note: 'a'.repeat(255) }).note, undefined);
  assert.ok(validateStatusChange({ to_status: 'DA_DONG', note: 'a'.repeat(256) }).note);
});