// Lớp API phiếu bảo hành: nhận/trả JSON, gọi validator và service; lỗi chuyển cho errorHandler chung.
// Mọi route cần đăng nhập; vai trò và trung tâm lấy từ token (req.user), không bao giờ từ body.
const express = require('express');
const AppError = require('../errors/AppError');
const { requireRole } = require('../middleware/require-role');
const { validateListQuery, validateCreate, validateSuggestion, validateStatusChange } = require('../validators/ticket.validator');

const NHAN_VIEN = 'NHAN_VIEN_TIEP_NHAN';
const handle = fn => async (req, res, next) => {
  try { await fn(req, res); } catch (err) { next(err); }
};
const failIfInvalid = errors => {
  if (Object.keys(errors).length) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields: errors });
};
const idParam = req => {
  if (!/^[0-9]+$/.test(req.params.id)) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
  return req.params.id;
};

function ticketRoutes(service, authenticate) {
  const router = express.Router();
  router.use(authenticate);

  // US6 – danh sách có lọc và phân trang
  router.get('/', handle(async (req, res) => {
    const { errors, value } = validateListQuery(req.query);
    failIfInvalid(errors);
    res.json(await service.list(value, req.user));
  }));

  // US6, US7 – chi tiết kèm nhật ký trạng thái
  router.get('/:id', handle(async (req, res) => {
    res.json(await service.getView(idParam(req), req.user));
  }));

  // US4 – đề xuất nhóm sự cố và mức ưu tiên từ mô tả lỗi
  router.post('/suggestion', requireRole(NHAN_VIEN), handle(async (req, res) => {
    failIfInvalid(validateSuggestion(req.body));
    res.json(await service.suggest(req.body.issue_desc));
  }));

  // US3, US4, US5 – tạo phiếu; hạn cam kết luôn do hệ thống tính nên body có due_date cũng bị bỏ qua
  router.post('/', requireRole(NHAN_VIEN), handle(async (req, res) => {
    failIfInvalid(validateCreate(req.body));
    const ticket = await service.create(req.body, req.user);
    res.status(201).json(await service.getView(ticket.ticket_id, req.user));
  }));

  // US7 – chuyển trạng thái; vai trò nào được chuyển tới đâu do service quyết định (QT-06, UC7 3b)
  router.patch('/:id/status', handle(async (req, res) => {
    const id = idParam(req);
    failIfInvalid(validateStatusChange(req.body));
    await service.changeStatus(id, req.body, req.user);
    res.json(await service.getView(id, req.user));
  }));

  return router;
}

// US4 – danh sách nhóm sự cố cho ô chọn
function issueCategoryRoutes(service, authenticate) {
  const router = express.Router();
  router.get('/', authenticate, handle(async (req, res) => res.json(await service.categories())));
  return router;
}

module.exports = { ticketRoutes, issueCategoryRoutes };