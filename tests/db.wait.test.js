// Kiểm thử vòng chờ CSDL của db:migrate bằng pool giả: thử lại khi CSDL chưa nhận kết nối, dừng khi hết lượt,
// và không thử lại với lỗi không phải lỗi kết nối (ví dụ sai mật khẩu).
const test = require('node:test');
const assert = require('node:assert/strict');
const { waitForDb } = require('../src/backend/db/wait-for-db');

const refused = () => Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
function fakePool(failures, error = refused) {
  let calls = 0;
  return { get calls() { return calls; }, async query() { calls++; if (calls <= failures) throw error(); return { rows: [] }; } };
}
const quiet = { delayMs: 1, log: () => {} };

test('luồng đúng: CSDL lên sau 2 lần từ chối thì migrate tiếp tục', async () => {
  const pool = fakePool(2);
  await waitForDb(pool, { retries: 5, ...quiet });
  assert.equal(pool.calls, 3);
});

test('biên: hết đúng số lần thử thì ném lỗi kết nối, không chờ vô hạn', async () => {
  const pool = fakePool(99);
  await assert.rejects(waitForDb(pool, { retries: 3, ...quiet }), /ECONNREFUSED/);
  assert.equal(pool.calls, 3);
});

test('dữ liệu sai: sai mật khẩu (28P01) báo lỗi ngay, không thử lại', async () => {
  const pool = fakePool(99, () => Object.assign(new Error('password authentication failed for user "postgres"'), { code: '28P01' }));
  await assert.rejects(waitForDb(pool, { retries: 5, ...quiet }), /password authentication failed/);
  assert.equal(pool.calls, 1);
});