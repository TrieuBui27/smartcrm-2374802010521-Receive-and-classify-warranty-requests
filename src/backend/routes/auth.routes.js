// Lớp API đăng nhập: POST /api/auth/login (công khai) và GET /api/auth/me (cần token).
const express = require('express');

function authRoutes(service, authenticate) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try { res.json(await service.login(req.body)); } catch (err) { next(err); }
  });

  // Giao diện dùng để khôi phục phiên sau khi tải lại trang.
  router.get('/me', authenticate, (req, res) => res.json(req.user));

  return router;
}

module.exports = { authRoutes };