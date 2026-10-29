// Chạy lần lượt các tệp migrations/*.sql chưa chạy; bảng schema_migrations ghi lại tệp đã chạy
// nên chạy lại nhiều lần không lỗi.
const fs = require('fs');
const path = require('path');
const pool = require('./pool');
const { waitForDb } = require('./wait-for-db');

const DIR = path.join(__dirname, '../../../migrations');

async function main() {
  await waitForDb(pool);
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    run_at   TIMESTAMP NOT NULL DEFAULT now()
  )`);
  const done = new Set((await pool.query('SELECT filename FROM schema_migrations')).rows.map(r => r.filename));
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) { console.log('bỏ qua  ', f); continue; }
    const sql = fs.readFileSync(path.join(DIR, f), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [f]);
      await client.query('COMMIT');
      console.log('đã chạy', f);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`${f}: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

main()
  .catch(err => { console.error('Migration lỗi:', err.message || err.code); process.exitCode = 1; })
  .finally(() => pool.end());