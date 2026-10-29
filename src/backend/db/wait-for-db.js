// Chờ CSDL sẵn sàng trước khi migrate: trong Docker, PostgreSQL cần vài giây sau khi container khởi động mới
// nhận kết nối. Thử lại tối đa `retries` lần, mỗi lần cách `delayMs`; lỗi không phải lỗi kết nối thì ném ngay.
const { isDbUnavailable } = require('./db-errors');

async function waitForDb(pool, { retries = 15, delayMs = 2000, log = console.log } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (!isDbUnavailable(err) || attempt >= retries) throw err;
      log(`chờ CSDL sẵn sàng (lần ${attempt}/${retries}): ${err.message || err.code}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { waitForDb };