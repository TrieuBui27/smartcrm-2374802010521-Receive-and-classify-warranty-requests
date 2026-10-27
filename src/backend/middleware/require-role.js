// Phân quyền theo vai trò (docs/api-contract.md mục 6). Dùng sau middleware authenticate.
const AppError = require('../errors/AppError');

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role)
    ? next()
    : next(new AppError('FORBIDDEN', 'Vai trò của bạn không được dùng chức năng này'));

module.exports = { requireRole };