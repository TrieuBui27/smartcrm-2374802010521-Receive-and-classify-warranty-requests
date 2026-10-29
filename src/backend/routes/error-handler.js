// Bộ xử lý lỗi chung của mọi route: định dạng { error: { code, message, fields... } } theo hợp đồng API.
// Đây là nơi DUY NHẤT ghi log lỗi: service và repository chỉ ném lỗi, không log rồi ném lại.
const AppError = require('../errors/AppError');
const { isDbUnavailable } = require('../db/db-errors');
const { logger } = require('../logger');

// Mã lỗi nghiệp vụ → mã HTTP (docs/api-contract.md). Mã lạ coi là 400.
const HTTP = {
  INVALID_PHONE: 400, VALIDATION_FAILED: 400,
  INVALID_CREDENTIALS: 401, UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CUSTOMER_NOT_FOUND: 404, NOT_FOUND: 404,
  PHONE_EXISTS: 409, DEVICE_HAS_OPEN_TICKET: 409,SERIAL_EXISTS: 409, DEVICE_HAS_TICKETS: 409,
  INVALID_TRANSITION: 422,
};

/**
 * Tạo middleware lỗi. Lỗi nghiệp vụ (AppError) ghi INFO vì là phản hồi đúng thiết kế; CSDL không dùng được
 * trả 503, lỗi khác trả 500, cả hai ghi ERROR kèm requestId và trả request_id để tra đúng dòng log.
 * Không bao giờ trả stack, câu SQL hay tên bảng cho người dùng.
 */
function createErrorHandler(log = logger) {
  // Phải đủ 4 tham số (kể cả next không dùng) thì Express mới coi là middleware lỗi.
  return (err, req, res, next) => {
    const requestId = req.requestId;
    if (err instanceof AppError) {
      log.info('từ chối yêu cầu theo quy tắc nghiệp vụ', { requestId, code: err.code });
      return res.status(HTTP[err.code] || 400).json({ error: { code: err.code, message: err.message, ...err.details } });
    }
    if (err.type === 'entity.parse.failed') {
      log.info('body không phải JSON hợp lệ', { requestId });
      return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Body không phải JSON hợp lệ' } });
    }
    if (isDbUnavailable(err)) {
      log.error('không kết nối được CSDL', { requestId, path: req.originalUrl.split('?')[0], err });
      return res.status(503).json({ error: {
        code: 'DB_UNAVAILABLE',
        message: 'Hệ thống tạm thời không kết nối được cơ sở dữ liệu, vui lòng thử lại sau ít phút',
        request_id: requestId,
      } });
    }
    log.error('lỗi hệ thống', { requestId, path: req.originalUrl.split('?')[0], err });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại', request_id: requestId } });
  };
}

const errorHandler = createErrorHandler();

module.exports = { errorHandler, createErrorHandler };