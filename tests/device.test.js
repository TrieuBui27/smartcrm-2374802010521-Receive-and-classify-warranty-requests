// Kiểm thử CRUD thiết bị (UC2, đóng TD-15): validator, DeviceService với repository giả và API qua HTTP thật.
// Viết TRƯỚC khi có device.service.js. Serial và tên máy lấy từ dữ liệu mẫu seeds/device.csv.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const lib = name => require(require.resolve(name, { paths: [path.join(__dirname, '../src/backend')] }));
const express = lib('express');
const AppError = require('../src/backend/errors/AppError');
const { validateCreate, validateUpdate } = require('../src/backend/validators/device.validator');
const { createDeviceService } = require('../src/backend/services/device.service');
const { createAuthenticate } = require('../src/backend/middleware/authenticate');
const { requireRole } = require('../src/backend/middleware/require-role');
const { deviceRoutes } = require('../src/backend/routes/device.routes');
const { errorHandler } = require('../src/backend/routes/error-handler');

const TODAY = '2026-10-29';
const NEW_DEVICE = { device_name: 'Samsung Galaxy A55', serial_no: 'SN350112233445566', purchase_date: '2026-03-05', warranty_months: 12 };

// Repository giả: khách 84 có thiết bị 1 (đã có phiếu), khách 90 có thiết bị 2 (chưa có phiếu).
function memoryRepo() {
  const devices = [
    { device_id: 1, customer_id: 84, device_name: 'TECNO Lite2', serial_no: 'SN281481716773', purchase_date: '2024-10-13', warranty_months: 12 },
    { device_id: 2, customer_id: 90, device_name: 'Apple Lite9', serial_no: 'SN290576547180', purchase_date: null, warranty_months: 12 },
  ];
  const ticketCount = { 1: 3, 2: 0 };
  return {
    devices,
    async customerExists(id) { return [84, 90].includes(Number(id)); },
    async findById(id) { return devices.find(d => d.device_id === Number(id)) || null; },
    async findBySerial(serial) { return devices.find(d => d.serial_no === serial) || null; },
    async create(customerId, d) {
      if (devices.some(x => x.serial_no === d.serial_no)) return null; // giống ON CONFLICT DO NOTHING
      const row = { device_id: devices.length + 1, customer_id: Number(customerId), ...d };
      devices.push(row);
      return row;
    },
    async update(id, fields) {
      const d = devices.find(x => x.device_id === Number(id));
      return d ? Object.assign(d, fields) : null;
    },
    async countTickets(id) { return ticketCount[id] || 0; },
    async remove(id) {
      const i = devices.findIndex(x => x.device_id === Number(id));
      if (i < 0) return false;
      devices.splice(i, 1);
      return true;
    },
  };
}

// ---------- Validator: dữ liệu sai và biên ----------
test('dữ liệu sai: thiếu tên máy và serial, ngày mua sau hôm nay, số tháng bảo hành ngoài 1–60', () => {
  assert.deepEqual(Object.keys(validateCreate({}, TODAY)).sort(), ['device_name', 'serial_no']);
  const errors = validateCreate({ ...NEW_DEVICE, purchase_date: '2026-10-30', warranty_months: 61 }, TODAY);
  assert.deepEqual(Object.keys(errors).sort(), ['purchase_date', 'warranty_months']);
  assert.ok(validateCreate({ ...NEW_DEVICE, purchase_date: '2026-02-30' }, TODAY).purchase_date); // ngày không tồn tại
  assert.ok(validateCreate({ ...NEW_DEVICE, warranty_months: '12' }, TODAY).warranty_months);    // phải là số nguyên
  assert.ok(validateUpdate({}, TODAY)._);
});

test('biên: ngày mua đúng hôm nay, bảo hành 1 và 60 tháng, ngày mua null đều hợp lệ', () => {
  for (const extra of [{ purchase_date: TODAY }, { warranty_months: 1 }, { warranty_months: 60 }, { purchase_date: null }]) {
    assert.deepEqual(validateCreate({ ...NEW_DEVICE, ...extra }, TODAY), {});
  }
});

// ---------- Service ----------
test('luồng đúng: tạo, xem, sửa, xóa thiết bị chưa có phiếu; mặc định bảo hành 12 tháng', async () => {
  const repo = memoryRepo();
  const service = createDeviceService(repo);
  const { warranty_months, ...noMonths } = NEW_DEVICE;
  const created = await service.create(90, { ...noMonths, serial_no: '  SN350112233445566 ' });
  assert.equal(created.customer_id, 90);
  assert.equal(created.serial_no, 'SN350112233445566'); // bỏ khoảng trắng hai đầu trước khi kiểm tra trùng
  assert.equal(created.warranty_months, 12);
  assert.equal((await service.getById(created.device_id)).device_name, 'Samsung Galaxy A55');
  assert.equal((await service.update(created.device_id, { warranty_months: 24 })).warranty_months, 24);
  await service.remove(created.device_id);
  await assert.rejects(service.getById(created.device_id), { code: 'NOT_FOUND' });
});

test('QT-03: serial đã thuộc thiết bị khác thì 409 SERIAL_EXISTS, cả khi tạo và khi sửa', async () => {
  const service = createDeviceService(memoryRepo());
  await assert.rejects(service.create(90, { ...NEW_DEVICE, serial_no: 'SN281481716773' }), { code: 'SERIAL_EXISTS' });
  await assert.rejects(service.update(2, { serial_no: 'SN281481716773' }), { code: 'SERIAL_EXISTS' });
  assert.equal((await service.update(1, { serial_no: 'SN281481716773' })).device_id, 1); // giữ serial của chính nó
});

test('không tạo thiết bị cho khách không tồn tại; không xóa thiết bị đã có phiếu (giữ lịch sử bảo hành)', async () => {
  const repo = memoryRepo();
  const service = createDeviceService(repo);
  await assert.rejects(service.create(999, NEW_DEVICE), { code: 'CUSTOMER_NOT_FOUND' });
  await assert.rejects(service.remove(1), { code: 'DEVICE_HAS_TICKETS' });
  assert.ok(repo.devices.some(d => d.device_id === 1));
  await assert.rejects(service.remove(999), { code: 'NOT_FOUND' });
});

// ---------- API qua HTTP ----------
async function withServer(fn) {
  const users = {
    'token-nv': { employee_id: 2, role: 'NHAN_VIEN_TIEP_NHAN', center_id: 1 },
    'token-ql': { employee_id: 1, role: 'QUAN_LY_TRUNG_TAM', center_id: 1 },
  };
  const authService = { verifyToken(t) { if (!users[t]) throw new AppError('UNAUTHORIZED', 'Chưa đăng nhập'); return users[t]; } };
  const service = createDeviceService(memoryRepo(), { today: () => TODAY });
  const app = express();
  app.use(express.json());
  const { customerDevices, devices } = deviceRoutes(service);
  const guard = [createAuthenticate(authService), requireRole('NHAN_VIEN_TIEP_NHAN')];
  app.use('/api/customers', ...guard, customerDevices);
  app.use('/api/devices', ...guard, devices);
  app.use(errorHandler);
  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const call = async (method, url, token, body) => {
    const res = await fetch(`http://localhost:${server.address().port}${url}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
  try { await fn(call); } finally { server.close(); }
}

test('API: POST 201, GET 200, PATCH 200, DELETE 204 rồi GET 404', () =>
  withServer(async call => {
    const created = await call('POST', '/api/customers/90/devices', 'token-nv', NEW_DEVICE);
    assert.equal(created.status, 201);
    const id = created.body.device_id;
    assert.equal((await call('GET', `/api/devices/${id}`, 'token-nv')).body.serial_no, 'SN350112233445566');
    assert.equal((await call('PATCH', `/api/devices/${id}`, 'token-nv', { device_name: 'Samsung Galaxy A55 5G' })).body.device_name, 'Samsung Galaxy A55 5G');
    assert.equal((await call('DELETE', `/api/devices/${id}`, 'token-nv')).status, 204);
    assert.equal((await call('GET', `/api/devices/${id}`, 'token-nv')).status, 404);
  }));

test('API: dữ liệu sai 400 có fields; serial trùng 409; khách không có 404; thiết bị có phiếu 409; Quản lý 403', () =>
  withServer(async call => {
    const bad = await call('POST', '/api/customers/90/devices', 'token-nv', { serial_no: '' });
    assert.equal(bad.status, 400);
    assert.deepEqual(Object.keys(bad.body.error.fields).sort(), ['device_name', 'serial_no']);
    assert.equal((await call('POST', '/api/customers/90/devices', 'token-nv', { ...NEW_DEVICE, serial_no: 'SN281481716773' })).status, 409);
    assert.equal((await call('POST', '/api/customers/999/devices', 'token-nv', NEW_DEVICE)).body.error.code, 'CUSTOMER_NOT_FOUND');
    assert.equal((await call('POST', '/api/customers/abc/devices', 'token-nv', NEW_DEVICE)).status, 404);
    const del = await call('DELETE', '/api/devices/1', 'token-nv');
    assert.deepEqual([del.status, del.body.error.code], [409, 'DEVICE_HAS_TICKETS']);
    assert.equal((await call('GET', '/api/devices/1', 'token-ql')).status, 403);
    assert.equal((await call('GET', '/api/devices/1')).status, 401);
  }));