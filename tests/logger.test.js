// Kiểm thử logger: một dòng JSON có thời điểm, mức, thông điệp; che dữ liệu nhạy cảm (mật khẩu, token, số điện thoại
// khách theo QT-15); bỏ qua mức thấp hơn LOG_LEVEL.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLogger, mask } = require('../src/backend/logger');

function capture(level) {
  const lines = [];
  return { log: createLogger({ level, write: line => lines.push(JSON.parse(line)) }), lines };
}

test('mỗi dòng log là JSON có time ISO, level, msg và ngữ cảnh', () => {
  const { log, lines } = capture('info');
  log.info('tạo phiếu thành công', { requestId: 'abc-1', ticketCode: 'BH-007798/2026' });
  assert.equal(lines.length, 1);
  assert.match(lines[0].time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual([lines[0].level, lines[0].msg, lines[0].requestId, lines[0].ticketCode],
    ['info', 'tạo phiếu thành công', 'abc-1', 'BH-007798/2026']);
});

test('không ghi mật khẩu, token, khóa bí mật và số điện thoại khách, kể cả trong đối tượng lồng', () => {
  const masked = mask({
    username: 'nv_tt04', password: 'Mekong@2026', authorization: 'Bearer eyJ...', SECRET_KEY: 'k',
    body: { customer_phone: '0901234567', phone: '0901234567', access_token: 't' },
  });
  assert.deepEqual(masked, {
    username: 'nv_tt04', password: '***', authorization: '***', SECRET_KEY: '***',
    body: { customer_phone: '***', phone: '***', access_token: '***' },
  });
});

test('Error được ghi thành type, message, code và stack', () => {
  const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), { code: 'ECONNREFUSED' });
  const out = mask({ err }).err;
  assert.deepEqual([out.type, out.message, out.code], ['Error', 'connect ECONNREFUSED 127.0.0.1:5432', 'ECONNREFUSED']);
  assert.match(out.stack, /ECONNREFUSED/);
});

test('biên: LOG_LEVEL=warn bỏ qua info và debug; silent không ghi gì', () => {
  const warn = capture('warn');
  warn.log.debug('d'); warn.log.info('i'); warn.log.warn('w'); warn.log.error('e');
  assert.deepEqual(warn.lines.map(l => l.level), ['warn', 'error']);
  const silent = capture('silent');
  silent.log.error('e');
  assert.equal(silent.lines.length, 0);
});