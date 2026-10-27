// Chặn yêu cầu chưa đăng nhập: đọc "Authorization: Bearer ..." và gắn người dùng vào req.user.
const AppError = require('../errors/AppError');

function createAuthenticate(authService) {
  return (req, res, next) => {
    try {
      const [scheme, token] = (req.get('Authorization') || '').split(' ');
      req.user = authService.verifyToken(scheme === 'Bearer' ? token : undefined);
      next();
    } catch (err) {
      next(err instanceof AppError ? err : new AppError('UNAUTHORIZED', 'Chưa đăng nhập'));
    }
  };
}

module.exports = { createAuthenticate };