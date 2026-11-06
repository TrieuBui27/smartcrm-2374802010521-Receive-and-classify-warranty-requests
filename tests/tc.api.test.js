// Buổi 14 (BT3), tầng API/SYSTEM: TC-08 và TC-12 gọi backend THẬT qua HTTP (cổng ngẫu nhiên), CSDL thật.
// Cần đã chạy db:migrate và db:seed; không có CSDL thì bỏ qua. Nhân viên thử tự tạo, xóa sạch ở cuối.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const bcrypt = lib('bcryptjs');
const pool = require('../src/backend/db/pool');

process.env.SECRET_KEY = process.env.SECRET_KEY || 'khoa-chi-dung-khi-kiem-thu';
const { app } = require('../src/backend/index');

const dbReady = async () => { try { await pool.query('SELECT 1 FROM ticket LIMIT 1'); return true; } catch { return false; } };

async function withServer(fn) {
  const server = app.listen(0);
  try { return await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}
const call = (base, method, url, body, token) => fetch(base + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));

async function newStaff(username) {
  const { rows: [e] } = await pool.query(
    `INSERT INTO employee (full_name, role, center_id, username, password_hash)
     VALUES ('Nhan vien TC', 'NHAN_VIEN_TIEP_NHAN', 1, $1, $2) RETURNING employee_id`,
    [username, bcrypt.hashSync('Mekong@2026', 4)]);
  return e.employee_id;
}
const login = (base, username) => call(base, 'POST', '/api/auth/login', { username, password: 'Mekong@2026' });

// TC-08 bảo mật (OWASP A07/A01): tài khoản bị khóa thì token đang giữ phải hết tác dụng ngay.
test('TC-08 nhân viên bị khóa tài khoản: token cũ gọi API phải nhận 401', async t => {
  if (!(await dbReady())) return t.skip('Chưa có CSDL smartcrm');
  const id = await newStaff('tc08_nv');
  try {
    await withServer(async base => {
      const ok = await login(base, 'tc08_nv');
      assert.equal(ok.status, 200);
      const token = ok.body.access_token;
      assert.equal((await call(base, 'GET', '/api/tickets', null, token)).status, 200); // trước khi khóa: dùng được
      await pool.query('UPDATE employee SET is_active = false WHERE employee_id = $1', [id]); // quản trị khóa tài khoản
      const after = await call(base, 'GET', '/api/tickets', null, token);
      assert.equal(after.status, 401);
      assert.equal(after.body.error.code, 'UNAUTHORIZED');
    });
  } finally { await pool.query('DELETE FROM employee WHERE employee_id = $1', [id]); }
});

// TC-12 dữ liệu sai: mô tả lỗi 9 ký tự (dưới ngưỡng 10) bị từ chối, kiểm mã HTTP, mã lỗi và thông báo theo ô.
test('TC-12 dữ liệu sai: mô tả lỗi 9 ký tự trả 400 VALIDATION_FAILED và nói rõ ô issue_desc', async t => {
  if (!(await dbReady())) return t.skip('Chưa có CSDL smartcrm');
  const id = await newStaff('tc12_nv');
  try {
    await withServer(async base => {
      const token = (await login(base, 'tc12_nv')).body.access_token;
      const r = await call(base, 'POST', '/api/tickets', { customer_id: 1, device_id: 1, issue_desc: '123456789' }, token);
      assert.equal(r.status, 400);
      assert.equal(r.body.error.code, 'VALIDATION_FAILED');
      assert.equal(r.body.error.fields.issue_desc, 'Mô tả lỗi phải có từ 10 đến 2000 ký tự');
    });
  } finally { await pool.query('DELETE FROM employee WHERE employee_id = $1', [id]); }
});