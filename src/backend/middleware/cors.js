// Cho giao diện (Vite chạy cổng khác) gọi API. Chỉ cho đúng một nguồn, đặt bằng CORS_ORIGIN trong .env.
function cors(origin = process.env.CORS_ORIGIN || 'http://localhost:5173') {
  return (req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

module.exports = { cors };