// Kiểm thử đăng nhập và xác thực token bằng repository giả: không cần CSDL thật.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
// Thư viện cài trong src/backend/node_modules nên chỉ đường cho require từ thư mục tests.
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const jwt = lib('jsonwebtoken');
const bcrypt = lib('bcryptjs');
const { createAuthService } = require('../src/backend/services/auth.service');

const SECRET = 'khoa-bi-mat-chi-dung-khi-kiem-thu';

function setup(overrides = {}) {
  const user = {
    employee_id: 2, username: 'nv_tt01', full_name: 'Nhân viên tiếp nhận TT01', role: 'NHAN_VIEN_TIEP_NHAN',
    center_id: 1, is_active: true, password_hash: bcrypt.hashSync('Mekong@2026', 4), ...overrides,
  };
  const repo = { async findByUsername(u) { return u === user.username ? user : null; } };
  return createAuthService(repo, { secret: SECRET });
}

test('luồng đúng: đăng nhập thành công trả token chứa user_id, role, center_id và không lộ mật khẩu', async () => {
  const out = await setup().login({ username: 'nv_tt01', password: 'Mekong@2026' });
  assert.equal(out.token_type, 'Bearer');
  assert.equal(out.expires_in, 8 * 3600);
  assert.deepEqual(out.user, { employee_id: 2, full_name: 'Nhân viên tiếp nhận TT01', role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 });
  const claims = jwt.verify(out.access_token, SECRET);
  assert.deepEqual([claims.user_id, claims.role, claims.center_id], [2, 'NHAN_VIEN_TIEP_NHAN', 1]);
  assert.equal(JSON.stringify(out).includes('password'), false);
});

test('sai mật khẩu, sai tên đăng nhập và tài khoản bị khóa cùng trả một lỗi, không cho biết tên có tồn tại', async () => {
  const svc = setup();
  const wrongPass = await svc.login({ username: 'nv_tt01', password: 'sai' }).catch(e => e);
  const unknown = await svc.login({ username: 'khong_co', password: 'Mekong@2026' }).catch(e => e);
  const locked = await setup({ is_active: false }).login({ username: 'nv_tt01', password: 'Mekong@2026' }).catch(e => e);
  for (const e of [wrongPass, unknown, locked]) assert.equal(e.code, 'INVALID_CREDENTIALS');
  assert.equal(wrongPass.message, unknown.message);
  assert.equal(wrongPass.message, locked.message);
});

test('dữ liệu xấu: thiếu hoặc rỗng tên đăng nhập, mật khẩu thì VALIDATION_FAILED chỉ rõ trường', async () => {
  const err = await setup().login({ username: '  ', password: undefined }).catch(e => e);
  assert.equal(err.code, 'VALIDATION_FAILED');
  assert.deepEqual(Object.keys(err.details.fields).sort(), ['password', 'username']);
});

test('verifyToken: token hợp lệ trả người dùng; thiếu, sai chữ ký hoặc hết hạn thì UNAUTHORIZED', async () => {
  const svc = setup();
  const { access_token } = await svc.login({ username: 'nv_tt01', password: 'Mekong@2026' });
  assert.deepEqual(svc.verifyToken(access_token), { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 });

  const forged = jwt.sign({ user_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 }, 'khoa-khac');
  const expired = jwt.sign({ user_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 }, SECRET, { expiresIn: -10 });
  for (const bad of [undefined, '', 'khong-phai-token', forged, expired]) {
    assert.throws(() => svc.verifyToken(bad), { code: 'UNAUTHORIZED' });
  }
});

test('thiếu khóa bí mật thì không tạo được service (tránh ký token bằng khóa rỗng)', () => {
  assert.throws(() => createAuthService({}, { secret: '' }), /SECRET_KEY/);
});