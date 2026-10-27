// Kiểm thử phần GHI của API phiếu qua HTTP thật (cổng ngẫu nhiên, repository giả trong bộ nhớ):
// tạo phiếu, đề xuất nhóm sự cố, đổi trạng thái, danh mục nhóm sự cố; mã HTTP, định dạng lỗi và phân quyền.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const express = lib('express');
const AppError = require('../src/backend/errors/AppError');
const { createTicketService } = require('../src/backend/services/ticket.service');
const { createAuthenticate } = require('../src/backend/middleware/authenticate');
const { ticketRoutes, issueCategoryRoutes } = require('../src/backend/routes/ticket.routes');
const { errorHandler } = require('../src/backend/routes/error-handler');

const USERS = {
  'token-nv': { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 },
  'token-ql': { employee_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 },
};
const CATEGORIES = [
  { category_id: 1, category_name: 'MAN_HINH', keywords: 'man hinh,soc man', default_priority: 'CAO' },
  { category_id: 2, category_name: 'PIN', keywords: 'pin,hao pin,chai pin', default_priority: 'TRUNG_BINH' },
  { category_id: 6, category_name: 'KHAC', keywords: null, default_priority: 'THAP' },
];
const DEVICES = [
  { device_id: 1, customer_id: 89, device_name: 'TECNO Lite2', serial_no: 'SN281481716773', purchase_date: '2026-03-05', warranty_months: 12 },
  { device_id: 2, customer_id: 90, device_name: 'Apple Lite9', serial_no: 'SN290576547180', purchase_date: null, warranty_months: 12 },
];

// Repository giả trong bộ nhớ, đủ các hàm mà TicketService dùng; mỗi test dựng một bản mới.
function memoryRepo() {
  const tickets = [], logs = [];
  const view = t => t && {
    ...t, customer_name: 'Nguyễn Văn An', customer_phone: '0901234567', device_name: 'TECNO Lite2',
    serial_no: 'SN281481716773', category_name: (CATEGORIES.find(c => c.category_id === t.category_id) || {}).category_name ?? null,
  };
  return {
    tickets,
    async findDeviceById(id) { return DEVICES.find(d => d.device_id === Number(id)) || null; },
    async findOpenTicketByDevice(id) { return tickets.find(t => t.device_id === Number(id) && !['DA_DONG', 'DA_HUY'].includes(t.status)) || null; },
    async findActiveCategories() { return CATEGORIES; },
    async createWithLog(t) {
      const row = { ticket_id: 1000 + tickets.length, ticket_code: `BH-00${1000 + tickets.length}/2026`, status: 'MOI', closed_at: null, ...t };
      tickets.push(row);
      logs.push({ ticket_id: row.ticket_id, from_status: null, to_status: 'MOI', changed_at: t.received_at, changed_by_name: 'Nhân viên', note: 'Tiếp nhận phiếu' });
      return row;
    },
    async findById(id) { return tickets.find(t => t.ticket_id === Number(id)) || null; },
    async updateStatusIfCurrent(id, from, to, by, note) {
      const t = tickets.find(x => x.ticket_id === Number(id));
      if (!t || t.status !== from) return null;
      t.status = to;
      const log = { ticket_id: t.ticket_id, from_status: from, to_status: to, changed_at: new Date(), changed_by_name: 'Quản lý', note };
      logs.push(log);
      return { ticket: t, log };
    },
    async findViewById(id) { return view(tickets.find(t => t.ticket_id === Number(id))); },
    async findLog(id) { return logs.filter(l => l.ticket_id === Number(id)); },
    async list() { return { rows: tickets.map(view), total: tickets.length }; },
  };
}

async function withServer(fn) {
  const authService = { verifyToken(t) { if (!USERS[t]) throw new AppError('UNAUTHORIZED', 'Chưa đăng nhập'); return USERS[t]; } };
  const authenticate = createAuthenticate(authService);
  const service = createTicketService(memoryRepo(), { now: () => new Date('2026-09-08T14:30:00+07:00') });
  const app = express();
  app.use(express.json());
  app.use('/api/issue-categories', issueCategoryRoutes(service, authenticate));
  app.use('/api/tickets', ticketRoutes(service, authenticate));
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const call = async (method, url, token, body) => {
    const res = await fetch(`http://localhost:${server.address().port}${url}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };
  try { await fn(call); } finally { server.close(); }
}

const NEW_TICKET = { customer_id: 89, device_id: 1, issue_desc: 'may bi pin chai chỉ còn dùng được nửa ngày' };

test('POST /api/tickets luồng đúng: 201, trạng thái MOI, nhóm PIN, hạn 72 giờ, bỏ qua due_date do client gửi', () =>
  withServer(async call => {
    const r = await call('POST', '/api/tickets', 'token-nv', { ...NEW_TICKET, due_date: '2030-01-01T00:00:00+07:00' });
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'MOI');
    assert.equal(r.body.category_name, 'PIN');
    assert.equal(r.body.priority, 'TRUNG_BINH');
    assert.equal(r.body.received_at, '2026-09-08T14:30:00+07:00');
    assert.equal(r.body.due_date, '2026-09-11T14:30:00+07:00');
    assert.equal(r.body.customer_phone, '090****567');
    assert.equal(r.body.status_log[0].to_status, 'MOI');
  }));

test('POST /api/tickets lỗi: thiếu trường 400 kèm fields, thiết bị đang có phiếu mở 409 kèm mã phiếu cũ, Quản lý 403, thiết bị lạ 404', () =>
  withServer(async call => {
    const bad = await call('POST', '/api/tickets', 'token-nv', { customer_id: 89 });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.error.fields).sort(), ['device_id', 'issue_desc']);
    const first = await call('POST', '/api/tickets', 'token-nv', NEW_TICKET);
    const dup = await call('POST', '/api/tickets', 'token-nv', NEW_TICKET);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, 'DEVICE_HAS_OPEN_TICKET');
    assert.equal(dup.body.error.open_ticket_code, first.body.ticket_code);
    assert.equal((await call('POST', '/api/tickets', 'token-ql', NEW_TICKET)).status, 403);
    assert.equal((await call('POST', '/api/tickets', 'token-nv', { ...NEW_TICKET, device_id: 99 })).status, 404);
    assert.equal((await call('POST', '/api/tickets', undefined, NEW_TICKET)).status, 401);
  }));

test('UC3 6b: thiết bị không có ngày mua thì tạo được phiếu nhưng warranty_verified = false và is_warranty = false', () =>
  withServer(async call => {
    const r = await call('POST', '/api/tickets', 'token-nv', { customer_id: 90, device_id: 2, issue_desc: 'màn hình bị sọc dọc từ tuần trước' });
    assert.equal(r.status, 201);
    assert.deepEqual([r.body.is_warranty, r.body.warranty_verified], [false, false]);
  }));

test('PATCH /api/tickets/:id/status: Quản lý chuyển đúng vòng đời 200 kèm nhật ký; sai vòng đời 422; Nhân viên chuyển DANG_XU_LY 403', () =>
  withServer(async call => {
    const t = (await call('POST', '/api/tickets', 'token-nv', NEW_TICKET)).body;
    const url = `/api/tickets/${t.ticket_id}/status`;
    const ok = await call('PATCH', url, 'token-ql', { to_status: 'DA_PHAN_CONG', note: 'Giao kỹ thuật viên' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.status, 'DA_PHAN_CONG');
    assert.equal(ok.body.status_log.at(-1).note, 'Giao kỹ thuật viên');
    const skip = await call('PATCH', url, 'token-ql', { to_status: 'HOAN_TAT' });
    assert.equal(skip.status, 422);
    assert.equal(skip.body.error.code, 'INVALID_TRANSITION');
    assert.equal((await call('PATCH', url, 'token-nv', { to_status: 'DANG_XU_LY' })).status, 403);
    assert.equal((await call('PATCH', url, 'token-ql', { to_status: 'XOA' })).status, 400);
    assert.equal((await call('PATCH', '/api/tickets/9999/status', 'token-ql', { to_status: 'DA_HUY' })).status, 404);
  }));

test('POST /api/tickets/suggestion và GET /api/issue-categories: đề xuất đúng nhóm; mô tả quá ngắn 400; danh mục không lộ từ khóa', () =>
  withServer(async call => {
    const s = await call('POST', '/api/tickets/suggestion', 'token-nv', { issue_desc: 'màn hình bị sọc dọc từ tuần trước' });
    assert.equal(s.status, 200);
    assert.deepEqual(s.body, { category_id: 1, category_name: 'MAN_HINH', priority: 'CAO' });
    assert.equal((await call('POST', '/api/tickets/suggestion', 'token-nv', { issue_desc: 'ngắn' })).status, 400);
    assert.equal((await call('POST', '/api/tickets/suggestion', 'token-ql', { issue_desc: 'màn hình bị sọc dọc' })).status, 403);
    const c = await call('GET', '/api/issue-categories', 'token-ql');
    assert.equal(c.status, 200);
    assert.deepEqual(c.body[0], { category_id: 1, category_name: 'MAN_HINH', default_priority: 'CAO' });
    assert.equal((await call('GET', '/api/issue-categories')).status, 401);
  }));