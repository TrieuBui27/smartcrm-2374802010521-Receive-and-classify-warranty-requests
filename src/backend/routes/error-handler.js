// Bộ xử lý lỗi chung của mọi route: định dạng { error: { code, message, fields... } } theo hợp đồng API.
const AppError = require('../errors/AppError');

// Mã lỗi nghiệp vụ → mã HTTP (docs/api-contract.md). Mã lạ coi là 400.
const HTTP = {
  INVALID_PHONE: 400, VALIDATION_FAILED: 400,
  INVALID_CREDENTIALS: 401, UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CUSTOMER_NOT_FOUND: 404, NOT_FOUND: 404,
  PHONE_EXISTS: 409, DEVICE_HAS_OPEN_TICKET: 409,
  INVALID_TRANSITION: 422,
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(HTTP[err.code] || 400).json({ error: { code: err.code, message: err.message, ...err.details } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Body không phải JSON hợp lệ' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống, vui lòng thử lại' } });
}

module.exports = { errorHandler };