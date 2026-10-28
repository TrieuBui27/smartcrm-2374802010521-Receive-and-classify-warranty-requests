// Nơi DUY NHẤT biết về HTTP: địa chỉ backend, gắn token, đổi lỗi của máy chủ thành ApiError, xử lý 401.
import { getToken, clearSession } from '../auth/session';

const BASE = import.meta.env.VITE_API_BASE_URL; // không ghi cứng địa chỉ trong mã

export class ApiError extends Error {
  constructor(status, code, message, fields = {}, extra = {}) {
    super(message);
    this.status = status;   // mã HTTP; 0 khi không kết nối được máy chủ
    this.code = code;       // mã nghiệp vụ do backend trả về, ví dụ DEVICE_HAS_OPEN_TICKET
    this.fields = fields;   // lỗi theo từng ô nhập (VALIDATION_FAILED)
    this.extra = extra;     // dữ liệu kèm theo lỗi, ví dụ open_ticket_code
  }
}

export async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được tới hệ thống. Vui lòng kiểm tra backend đã chạy chưa rồi thử lại.');
  }

  if (res.status === 204) return null;
  let body = null;
  try { body = await res.json(); } catch { /* phản hồi không phải JSON */ }

  if (!res.ok) {
    // Phiên hết hạn hoặc chưa đăng nhập: xóa token và về trang đăng nhập, trừ chính yêu cầu đăng nhập.
    if (res.status === 401 && !path.startsWith('/api/auth/login')) {
      clearSession();
      window.location.assign('/login');
    }
    const { code, message, fields, ...extra } = body?.error || {};
    throw new ApiError(res.status, code, message || 'Có lỗi xảy ra. Vui lòng thử lại.', fields, extra);
  }
  return body;
}