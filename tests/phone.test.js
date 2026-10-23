// Kiểm thử QT-02 (chuẩn hóa số điện thoại) và QT-15 (che số). Chạy: cd src/backend && npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, maskPhone } = require('../src/backend/services/phone');

test('luồng đúng: các dạng số trong bộ dữ liệu đều về 0xxxxxxxxx', () => {
  assert.equal(normalizePhone('0901234567'), '0901234567');
  assert.equal(normalizePhone('0901 234 567'), '0901234567');
  assert.equal(normalizePhone('0760.833.592'), '0760833592');
  assert.equal(normalizePhone('+84901234567'), '0901234567');
  assert.equal(normalizePhone('84901234567'), '0901234567');
});

test('giá trị biên: đúng 10 chữ số thì nhận, 9 hoặc 11 chữ số thì từ chối', () => {
  assert.equal(normalizePhone('0123456789'), '0123456789');
  assert.equal(normalizePhone('012345678'), null);
  assert.equal(normalizePhone('01234567890'), null);
});

test('dữ liệu sai: rỗng, chữ, null trả null chứ không ném lỗi', () => {
  for (const v of ['', '12345', 'abc0901234567', null, undefined]) assert.equal(normalizePhone(v), null);
});

test('QT-15: che giữa số điện thoại', () => {
  assert.equal(maskPhone('0901234567'), '090****567');
});