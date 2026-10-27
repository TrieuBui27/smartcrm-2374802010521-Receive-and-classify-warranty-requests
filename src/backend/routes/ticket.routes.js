// Lớp API phiếu bảo hành: nhận/trả JSON, gọi validator và service; lỗi chuyển cho errorHandler chung.
// Mọi route cần đăng nhập; vai trò và trung tâm lấy từ token (req.user), không bao giờ từ body.
const express = require('express');
const AppError = require('../errors/AppError');
const { validateListQuery } = require('../validators/ticket.validator');

function ticketRoutes(service, authenticate) {
  const router = express.Router();
  router.use(authenticate);

  const handle = fn => async (req, res, next) => {
    try { await fn(req, res); } catch (err) { next(err); }
  };
  const failIfInvalid = errors => {
    if (Object.keys(errors).length) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields: errors });
  };

  // US6 – danh sách có lọc và phân trang
  router.get('/', handle(async (req, res) => {
    const { errors, value } = validateListQuery(req.query);
    failIfInvalid(errors);
    res.json(await service.list(value, req.user));
  }));

  // US6, US7 – chi tiết kèm nhật ký trạng thái
  router.get('/:id', handle(async (req, res) => {
    if (!/^[0-9]+$/.test(req.params.id)) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
    res.json(await service.getView(req.params.id, req.user));
  }));

  return router;
}

module.exports = { ticketRoutes };