// Kiểm thử lớp API phiếu qua HTTP thật (cổng ngẫu nhiên, repository giả): mã HTTP, định dạng lỗi, 401 và 403.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const express = lib('express');
const AppError = require('../src/backend/errors/AppError');
const { createTicketService } = require('../src/backend/services/ticket.service');
const { createAuthenticate } = require('../src/backend/middleware/authenticate');
const { ticketRoutes } = require('../src/backend/routes/ticket.routes');
const { errorHandler } = require('../src/backend/routes/error-handler');

const USERS = {
  'token-nv': { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 },
  'token-ql': { employee_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 },
};
const ROW = {
  ticket_id: 231, ticket_code: 'BH-000231/2025', status: 'DANG_XU_LY', priority: 'CAO', category_name: 'MAN_HINH',
  issue_desc: 'may bi màn hình bị sọc dọc', accessories: null, customer_name: 'Nguyễn Văn An', customer_phone: '0901234567',
  device_name: 'Apple Lite9', serial_no: 'SN290576547180', center_id: 1, received_at: new Date('2026-09-07T16:30:00+07:00'),
  due_date: new Date('2026-09-08T16:30:00+07:00'), closed_at: null, is_warranty: true, warranty_verified: true,
};
const repo = {
  async list() { return { rows: [ROW], total: 1 }; },
  async findViewById(id) { return Number(id) === 231 ? ROW : Number(id) === 232 ? { ...ROW, ticket_id: 232, center_id: 2 } : null; },
  async findLog() { return []; },
};

// Khởi động ứng dụng thật với lớp xác thực giả: token-nv, token-ql hợp lệ, còn lại UNAUTHORIZED.
async function withServer(fn) {
  const authService = { verifyToken(t) { if (!USERS[t]) throw new AppError('UNAUTHORIZED', 'Chưa đăng nhập'); return USERS[t]; } };
  const app = express();
  app.use(express.json());
  app.use('/api/tickets', ticketRoutes(createTicketService(repo), createAuthenticate(authService)));
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const call = async (url, token) => {
    const res = await fetch(`http://localhost:${server.address().port}${url}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    return { status: res.status, body: await res.json() };
  };
  try { await fn(call); } finally { server.close(); }
}

test('GET /api/tickets: có token trả 200 đúng hợp đồng (items, page, size, total), Nhân viên bị che số điện thoại', () =>
  withServer(async call => {
    const r = await call('/api/tickets?page=1&size=20', 'token-nv');
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.page, r.body.size, r.body.total], [1, 20, 1]);
    assert.equal(r.body.items[0].customer_phone, '090****567');
    assert.equal((await call('/api/tickets', 'token-ql')).body.items[0].customer_phone, '0901234567');
  }));

test('thiếu hoặc sai token thì 401 UNAUTHORIZED với đúng định dạng lỗi', () =>
  withServer(async call => {
    for (const token of [undefined, 'token-gia']) {
      const r = await call('/api/tickets', token);
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, 'UNAUTHORIZED');
      assert.equal(typeof r.body.error.message, 'string');
    }
  }));

test('mã lỗi HTTP: tham số sai 400 kèm fields, trung tâm khác 403, không có phiếu 404, mã phiếu không phải số 404', () =>
  withServer(async call => {
    const bad = await call('/api/tickets?size=500&status=XOA', 'token-ql');
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.error.fields).sort(), ['size', 'status']);
    assert.equal((await call('/api/tickets?center_id=2', 'token-ql')).status, 403);
    assert.equal((await call('/api/tickets/232', 'token-ql')).status, 403);
    assert.equal((await call('/api/tickets/999', 'token-ql')).status, 404);
    assert.equal((await call('/api/tickets/abc', 'token-ql')).status, 404);
    const ok = await call('/api/tickets/231', 'token-ql');
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.status_log, []);
  }));