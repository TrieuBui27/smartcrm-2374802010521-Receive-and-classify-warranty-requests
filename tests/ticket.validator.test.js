// Kiểm thử bộ kiểm tra tham số danh sách phiếu (GET /api/tickets): luồng đúng, giá trị biên, dữ liệu sai.
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateListQuery } = require('../src/backend/validators/ticket.validator');

test('luồng đúng: không có tham số thì mặc định page 1, size 20; tham số hợp lệ được đổi sang kiểu số và boolean', () => {
  assert.deepEqual(validateListQuery({}), { errors: {}, value: { page: 1, size: 20 } });
  const r = validateListQuery({ status: 'DANG_XU_LY', overdue: 'true', page: '2', size: '50', center_id: '3' });
  assert.deepEqual(r, { errors: {}, value: { status: 'DANG_XU_LY', overdue: true, page: 2, size: 50, center_id: 3 } });
});

test('giá trị biên: size tối đa 100 và tối thiểu 1; page từ 1', () => {
  assert.equal(validateListQuery({ size: '100' }).errors.size, undefined);
  assert.equal(validateListQuery({ size: '1' }).errors.size, undefined);
  assert.ok(validateListQuery({ size: '101' }).errors.size);
  assert.ok(validateListQuery({ size: '0' }).errors.size);
  assert.ok(validateListQuery({ page: '0' }).errors.page);
});

test('dữ liệu sai: trạng thái lạ, overdue không phải true/false, số không nguyên đều báo lỗi đúng trường', () => {
  const { errors } = validateListQuery({ status: 'XOA', overdue: 'co', page: 'a', size: '1.5', center_id: '-2' });
  assert.deepEqual(Object.keys(errors).sort(), ['center_id', 'overdue', 'page', 'size', 'status']);
});