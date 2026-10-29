// Logger dùng chung của backend: mỗi dòng log là một đối tượng JSON ghi ra stdout (đọc được bằng
// "docker compose logs"), có thời điểm ISO, mức log, thông điệp và ngữ cảnh. Cấu hình một lần ở đây,
// mức log lấy từ biến môi trường LOG_LEVEL (debug | info | warn | error | silent).
const { randomUUID } = require('crypto');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
// Khóa chứa một trong các chuỗi này bị che: mật khẩu, token, khóa bí mật và số điện thoại khách (QT-15).
const MASKED_KEYS = ['password', 'token', 'authorization', 'secret', 'phone', 'so_dien_thoai'];

/** Trả bản sao của ngữ cảnh log với các trường nhạy cảm đổi thành '***'; Error đổi thành {type, message, code, stack}. */
function mask(value) {
  if (value instanceof Error) {
    return { type: value.name, message: value.message, code: value.code, stack: value.stack };
  }
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(mask);
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = MASKED_KEYS.some(k => key.toLowerCase().includes(k)) ? '***' : mask(v);
  }
  return out;
}

/**
 * Tạo logger. Kiểm thử truyền write riêng để đọc lại dòng log thay vì ghi ra stdout.
 * @param {{level?: string, write?: function}} options
 */
function createLogger({ level = 'info', write = line => process.stdout.write(line + '\n') } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const log = lvl => (msg, context = {}) => {
    if (LEVELS[lvl] < min) return;
    write(JSON.stringify({ time: new Date().toISOString(), level: lvl, msg, ...mask(context) }));
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

// Khi chạy bằng "node --test" (có NODE_TEST_CONTEXT) không ghi log để kết quả test dễ đọc, kể cả khi .env có LOG_LEVEL.
const logger = createLogger({ level: process.env.NODE_TEST_CONTEXT ? 'silent' : process.env.LOG_LEVEL || 'info' });

/**
 * Middleware gán requestId cho mỗi yêu cầu (nhận X-Request-Id từ client nếu hợp lệ, không thì tự sinh),
 * trả lại trong header X-Request-Id và ghi một dòng log khi yêu cầu kết thúc.
 * Chỉ ghi đường dẫn, không ghi query string vì có thể chứa số điện thoại (GET /api/customers?phone=...).
 */
function requestId(log = logger) {
  return (req, res, next) => {
    const incoming = req.get('X-Request-Id');
    req.requestId = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
    res.set('X-Request-Id', req.requestId);
    const start = Date.now();
    // Docker gọi /health 10 giây một lần: ghi ở mức debug để không làm ngập log.
    const level = req.path === '/health' ? 'debug' : 'info';
    res.on('finish', () => log[level]('request done', {
      requestId: req.requestId, method: req.method, path: req.originalUrl.split('?')[0],
      status: res.statusCode, ms: Date.now() - start, userId: req.user?.employee_id,
    }));
    next();
  };
}

module.exports = { logger, createLogger, mask, requestId };