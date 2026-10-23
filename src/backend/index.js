// Điểm khởi động backend: ghép ba lớp routes → services → repositories rồi mở cổng.
const express = require('express');
const pool = require('./db/pool');
const customerRepo = require('./repositories/customer.repository');
const { createCustomerService } = require('./services/customer.service');
const { customerRoutes, errorHandler } = require('./routes/customer.routes');

const app = express();
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

app.use('/api/customers', customerRoutes(createCustomerService(customerRepo)));
app.use(errorHandler);

const port = process.env.APP_PORT || 3000;
app.listen(port, () => console.log('Server chạy tại http://localhost:' + port));