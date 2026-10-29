// Lớp API thiết bị (UC2): nhận/trả JSON, gọi validator và service; lỗi chuyển cho errorHandler chung.
// customerDevices gắn dưới /api/customers (POST /:id/devices), devices gắn ở /api/devices.
const express = require('express');
const AppError = require('../errors/AppError');
const { validateCreate, validateUpdate } = require('../validators/device.validator');

const handle = fn => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};
const failIfInvalid = fields => {
  if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields });
};
const idParam = (req, code, message) => {
  if (!/^[0-9]+$/.test(req.params.id)) throw new AppError(code, message);
  return req.params.id;
};

function deviceRoutes(service) {
  const customerDevices = express.Router();
  customerDevices.post('/:id/devices', handle(async (req, res) => {
    const customerId = idParam(req, 'CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    failIfInvalid(validateCreate(req.body, service.today()));
    res.status(201).json(await service.create(customerId, req.body));
  }));

  const devices = express.Router();
  const deviceId = req => idParam(req, 'NOT_FOUND', 'Không tìm thấy thiết bị');
  devices.get('/:id', handle(async (req, res) => res.json(await service.getById(deviceId(req)))));
  devices.patch('/:id', handle(async (req, res) => {
    const id = deviceId(req);
    failIfInvalid(validateUpdate(req.body, service.today()));
    res.json(await service.update(id, req.body));
  }));
  devices.delete('/:id', handle(async (req, res) => {
    await service.remove(deviceId(req));
    res.status(204).end();
  }));

  return { customerDevices, devices };
}

module.exports = { deviceRoutes };