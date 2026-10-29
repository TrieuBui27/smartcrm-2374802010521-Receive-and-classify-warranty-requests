// Điểm khởi động backend: ghép ba lớp routes → services → repositories rồi mở cổng.
const express = require('express');
const pool = require('./db/pool');
const customerRepo = require('./repositories/customer.repository');
const { createCustomerService } = require('./services/customer.service');
const authRepo = require('./repositories/auth.repository');
const { createAuthService } = require('./services/auth.service');
const { createAuthenticate } = require('./middleware/authenticate');
const { authRoutes } = require('./routes/auth.routes');
const { customerRoutes } = require('./routes/customer.routes');
const ticketRepo = require('./repositories/ticket.repository');
const { createTicketService } = require('./services/ticket.service');
const { ticketRoutes, issueCategoryRoutes } = require('./routes/ticket.routes');
const { errorHandler } = require('./routes/error-handler');
const { requireRole } = require('./middleware/require-role');
const { cors } = require('./middleware/cors');
const { logger, requestId } = require('./logger');

const app = express();
app.use(requestId());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Hello Smart CRM'));

// Kiểm tra sức khỏe cho Docker healthcheck và người vận hành: 200 khi truy vấn được CSDL, 503 khi không.
async function health(req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    logger.warn('health: không kết nối được CSDL', { requestId: req.requestId, err });
    res.status(503).json({ status: 'error', db: 'unavailable' });
  }
}
app.get('/health', health);
app.get('/db-check', health); // giữ đường dẫn cũ của buổi 2 (TD-07)

const authService = createAuthService(authRepo, { secret: process.env.SECRET_KEY });
const authenticate = createAuthenticate(authService);
app.use('/api/auth', authRoutes(authService, authenticate));
// Hợp đồng API mục 6: tra cứu và tạo khách hàng chỉ dành cho Nhân viên tiếp nhận.
app.use('/api/customers', authenticate, requireRole('NHAN_VIEN_TIEP_NHAN'), customerRoutes(createCustomerService(customerRepo)));
const ticketService = createTicketService(ticketRepo);
app.use('/api/issue-categories', issueCategoryRoutes(ticketService, authenticate));
app.use('/api/tickets', ticketRoutes(ticketService, authenticate));
app.use(errorHandler);

const port = process.env.APP_PORT || 3000;
app.listen(port, () => logger.info('backend đã chạy', { url: 'http://localhost:' + port }));