// Nhận biết lỗi "không dùng được CSDL" (CSDL tắt, mất mạng, hết thời gian chờ kết nối) để trả 503 thay vì 500.
// Lỗi dữ liệu hay lỗi câu SQL vẫn là lỗi hệ thống 500, không thuộc nhóm này.
const NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH']);
// Mã SQLSTATE của PostgreSQL: lớp 08 là lỗi kết nối; 57P01–57P03 là máy chủ đang tắt hoặc chưa sẵn sàng.
const PG_CODES = new Set(['57P01', '57P02', '57P03']);
const PG_MESSAGES = [/timeout exceeded when trying to connect/i, /Connection terminated/i, /Query read timeout/i];

function isDbUnavailable(err) {
  if (!err) return false;
  if (NETWORK_CODES.has(err.code) || PG_CODES.has(err.code)) return true;
  if (typeof err.code === 'string' && /^08/.test(err.code)) return true;
  // Windows thử cả ::1 và 127.0.0.1 nên lỗi kết nối có thể là AggregateError chứa nhiều lỗi con.
  if (Array.isArray(err.errors) && err.errors.some(isDbUnavailable)) return true;
  return PG_MESSAGES.some(re => re.test(err.message || ''));
}

module.exports = { isDbUnavailable };