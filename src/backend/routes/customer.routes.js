// Lớp API khách hàng: nhận/trả JSON, gọi validator và service; lỗi chuyển cho errorHandler chung (error-handler.js).
const express = require('express');
const AppError = require('../errors/AppError');
const { validateCreate, validateUpdate } = require('../validators/customer.validator');

function customerRoutes(service) {
  const router = express.Router();

  const handle = fn => async (req, res, next) => {
    try { await fn(req, res); } catch (err) { next(err); }
  };
  const failIfInvalid = fields => {
    if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields });
  };
  const idParam = req => {
    if (!/^[0-9]+$/.test(req.params.id)) throw new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    return req.params.id;
  };

  // EP1 – tra cứu theo số điện thoại (US1)
  router.get('/', handle(async (req, res) => {
    if (req.query.phone === undefined) {
      throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields: { phone: 'Thiếu tham số phone' } });
    }
    res.json(await service.lookupByPhone(req.query.phone));
  }));

  router.post('/', handle(async (req, res) => {
    failIfInvalid(validateCreate(req.body));
    res.status(201).json(await service.create(req.body));
  }));

  router.get('/:id', handle(async (req, res) => {
    res.json(await service.getById(idParam(req)));
  }));

  router.patch('/:id', handle(async (req, res) => {
    const id = idParam(req);
    failIfInvalid(validateUpdate(req.body));
    res.json(await service.update(id, req.body));
  }));

  router.delete('/:id', handle(async (req, res) => {
    await service.remove(idParam(req));
    res.status(204).end();
  }));

  return router;
}

module.exports = { customerRoutes };