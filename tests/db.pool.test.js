// BUG-002 (Critical): PostgreSQL tắt hoặc khởi động lại khi backend đang chạy thì kết nối rảnh trong pool phát
// sự kiện 'error'. Trước khi sửa không ai nghe sự kiện này nên Node tắt luôn cả backend. Test không cần CSDL.
const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/backend/db/pool');
const { isDbUnavailable } = require('../src/backend/db/db-errors');

test('pool có hàm nghe sự kiện error: kết nối rảnh bị cắt không làm sập backend', () => {
  assert.ok(pool.listenerCount('error') >= 1);
  const err = Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' });
  assert.doesNotThrow(() => pool.emit('error', err));
});

test('pool có thời gian chờ kết nối để yêu cầu không treo khi CSDL không trả lời', () => {
  assert.ok(pool.options.connectionTimeoutMillis > 0);
});

test('nhận biết lỗi "không dùng được CSDL" và không nhầm với lỗi dữ liệu', () => {
  const e = (code, message = 'x') => Object.assign(new Error(message), { code });
  assert.ok(isDbUnavailable(e('ECONNREFUSED')));
  assert.ok(isDbUnavailable(e('57P01')));
  assert.ok(isDbUnavailable(e('08006')));
  assert.ok(isDbUnavailable(new Error('Connection terminated due to connection timeout')));
  // Windows thử cả ::1 và 127.0.0.1 nên lỗi là AggregateError chứa hai lỗi ECONNREFUSED.
  assert.ok(isDbUnavailable(new AggregateError([e('ECONNREFUSED'), e('ECONNREFUSED')], 'x')));
  assert.ok(!isDbUnavailable(e('23505')));            // trùng khóa: lỗi dữ liệu
  assert.ok(!isDbUnavailable(e('42P01', 'relation "ticket" does not exist'))); // chưa migrate: lỗi cấu hình
  assert.ok(!isDbUnavailable(new TypeError('x')));
  assert.ok(!isDbUnavailable(undefined));
});

test.after(() => pool.end());