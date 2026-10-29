// Kiểm thử xử lý lỗi xuyên lớp qua HTTP thật (cổng ngẫu nhiên): mỗi yêu cầu có X-Request-Id; lỗi nghiệp vụ ghi INFO;
// CSDL tắt thì trả 503 DB_UNAVAILABLE thay vì 500 (BUG-002); lỗi lạ trả 500 không lộ chi tiết kỹ thuật;
// mỗi lỗi chỉ ghi ĐÚNG MỘT dòng log ERROR, ở middleware lỗi.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const express = lib('express');
const AppError = require('../src/backend/errors/AppError');
const { createLogger, requestId } = require('../src/backend/logger');
const { createErrorHandler } = require('../src/backend/routes/error-handler');

// Lỗi giống hệt lỗi thư viện pg ném ra khi PostgreSQL đã tắt.
const dbDown = () => Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });

async function withServer(fn) {
  const lines = [];
  const log = createLogger({ level: 'debug', write: line => lines.push(JSON.parse(line)) });
  const app = express();
  app.use(requestId(log));
  app.use(express.json());
  app.get('/rule', () => { throw new AppError('DEVICE_HAS_OPEN_TICKET', 'Thiết bị đang có phiếu chưa đóng'); });
  app.get('/db-down', async () => { throw dbDown(); });
  app.get('/timeout', async () => { throw new Error('timeout exceeded when trying to connect'); });
  app.get('/bug', async () => { throw new TypeError("Cannot read properties of null (reading 'trim')"); });
  app.post('/json', (req, res) => res.json(req.body));
  app.use(createErrorHandler(log));
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const call = async (url, options = {}) => {
    const res = await fetch(`http://localhost:${server.address().port}${url}`, options);
    return { status: res.status, id: res.headers.get('x-request-id'), body: await res.json() };
  };
  try { await fn(call, lines); } finally { server.close(); }
}

test('luồng đúng: lỗi nghiệp vụ giữ mã HTTP và định dạng cũ, chỉ ghi log INFO, có X-Request-Id', () =>
  withServer(async (call, lines) => {
    const r = await call('/rule');
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'DEVICE_HAS_OPEN_TICKET');
    assert.match(r.id, /^[0-9a-f-]{36}$/);
    assert.equal(lines.filter(l => l.level === 'error').length, 0);
    assert.ok(lines.some(l => l.level === 'info' && l.code === 'DEVICE_HAS_OPEN_TICKET' && l.requestId === r.id));
  }));

test('CSDL tắt hoặc hết thời gian chờ kết nối: 503 DB_UNAVAILABLE kèm request_id, một dòng ERROR cùng requestId', () =>
  withServer(async (call, lines) => {
    for (const url of ['/db-down', '/timeout']) {
      lines.length = 0;
      const r = await call(url);
      assert.equal(r.status, 503);
      assert.equal(r.body.error.code, 'DB_UNAVAILABLE');
      assert.equal(r.body.error.request_id, r.id);
      const errors = lines.filter(l => l.level === 'error');
      assert.equal(errors.length, 1);
      assert.equal(errors[0].requestId, r.id);
    }
  }));

test('lỗi lạ: 500 INTERNAL_ERROR không lộ stack hay thông điệp gốc; chi tiết chỉ nằm trong log', () =>
  withServer(async (call, lines) => {
    const r = await call('/bug');
    assert.equal(r.status, 500);
    assert.deepEqual(Object.keys(r.body.error).sort(), ['code', 'message', 'request_id']);
    assert.doesNotMatch(JSON.stringify(r.body), /trim|stack|TypeError/);
    const [err] = lines.filter(l => l.level === 'error');
    assert.match(err.err.message, /trim/);
  }));

test('dữ liệu sai: body không phải JSON trả 400 VALIDATION_FAILED, không ghi ERROR', () =>
  withServer(async (call, lines) => {
    const r = await call('/json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"phone": ' });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'VALIDATION_FAILED');
    assert.equal(lines.filter(l => l.level === 'error').length, 0);
  }));

test('biên: X-Request-Id hợp lệ từ client được giữ, giá trị lạ (có khoảng trắng, ký tự đặc biệt) bị thay bằng mã mới', () =>
  withServer(async call => {
    assert.equal((await call('/rule', { headers: { 'X-Request-Id': 'demo-123' } })).id, 'demo-123');
    const r = await call('/rule', { headers: { 'X-Request-Id': 'a b;drop' } });
    assert.notEqual(r.id, 'a b;drop');
    assert.match(r.id, /^[0-9a-f-]{36}$/);
  }));