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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Hello Smart CRM'));

// Giữ từ buổi 2 (TD-07): kiểm tra kết nối CSDL.
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({ status: 'OK', ...result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Không kết nối được CSDL' });
  }
});

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
app.listen(port, () => console.log('Server chạy tại http://localhost:' + port));