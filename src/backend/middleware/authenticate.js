// Chặn yêu cầu chưa đăng nhập: đọc "Authorization: Bearer ..." và gắn người dùng vào req.user.
const AppError = require('../errors/AppError');

function createAuthenticate(authService) {
  // currentUser kiểm lại tài khoản trong CSDL (BUG-004); dịch vụ giả trong kiểm thử chỉ có verifyToken thì dùng cái đó.
  const identify = authService.currentUser || (async token => authService.verifyToken(token));
  return async (req, res, next) => {
    try {
      const [scheme, token] = (req.get('Authorization') || '').split(' ');
      req.user = await identify(scheme === 'Bearer' ? token : undefined);
      next();
    } catch (err) {
      next(err instanceof AppError ? err : new AppError('UNAUTHORIZED', 'Chưa đăng nhập'));
    }
  };
}

module.exports = { createAuthenticate };