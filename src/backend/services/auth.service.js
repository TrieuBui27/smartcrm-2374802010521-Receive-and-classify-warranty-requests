// Đăng nhập và xác thực token (A1: người dùng đã đăng nhập, vai trò và trung tâm lấy từ bảng employee). Không biết gì về HTTP.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');

const TOKEN_SECONDS = 8 * 3600; // một ca làm việc
// Băm giả để so mật khẩu cả khi không có tài khoản, tránh lộ "tên này có tồn tại" qua thời gian phản hồi.
const DUMMY_HASH = bcrypt.hashSync('khong-ai-dung-mat-khau-nay', 10);
const BAD_LOGIN = () => new AppError('INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu');

/**
 * Tạo AuthService gắn với một repository (thật hoặc giả trong kiểm thử).
 * @param {{findByUsername: function}} repo Trả dòng employee kèm password_hash, hoặc null.
 * @param {{secret: string}} options secret: khóa ký token (biến môi trường SECRET_KEY).
 */
function createAuthService(repo, { secret }) {
  if (!secret) throw new Error('Thiếu SECRET_KEY: đặt khóa bí mật trong .env trước khi chạy máy chủ');

  /**
   * Đăng nhập bằng tên đăng nhập và mật khẩu.
   * @param {{username: string, password: string}} input
   * @returns {Promise} access_token (JWT chứa user_id, role, center_id), token_type, expires_in và thông tin user.
   * @throws {AppError} VALIDATION_FAILED khi thiếu trường; INVALID_CREDENTIALS khi sai tên, sai mật khẩu hoặc
   *   tài khoản bị khóa (cùng một thông báo cho cả ba trường hợp).
   */
  async function login({ username, password } = {}) {
    const fields = {};
    if (typeof username !== 'string' || !username.trim()) fields.username = 'Vui lòng nhập tên đăng nhập';
    if (typeof password !== 'string' || !password) fields.password = 'Vui lòng nhập mật khẩu';
    if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields });

    const user = await repo.findByUsername(username.trim());
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok || !user.is_active) throw BAD_LOGIN();

    const access_token = jwt.sign(
      { user_id: user.employee_id, role: user.role, center_id: user.center_id },
      secret, { algorithm: 'HS256', expiresIn: TOKEN_SECONDS });
    return {
      access_token, token_type: 'Bearer', expires_in: TOKEN_SECONDS,
      user: { employee_id: user.employee_id, full_name: user.full_name, role: user.role, center_id: user.center_id },
    };
  }

  /**
   * Kiểm tra token của một yêu cầu.
   * @param {string} [token] Chuỗi JWT (không kèm chữ Bearer).
   * @returns {{employee_id: number, role: string, center_id: number}} Người đang đăng nhập, dạng service nghiệp vụ dùng.
   * @throws {AppError} UNAUTHORIZED khi thiếu, sai chữ ký hoặc hết hạn.
   */
  function verifyToken(token) {
    try {
      const c = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return { employee_id: c.user_id, role: c.role, center_id: c.center_id };
    } catch {
      throw new AppError('UNAUTHORIZED', 'Chưa đăng nhập hoặc phiên đã hết hạn');
    }
  }

  return { login, verifyToken };
}

module.exports = { createAuthService };