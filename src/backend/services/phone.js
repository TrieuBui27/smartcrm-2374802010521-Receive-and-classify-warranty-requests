// QT-02: chuẩn hóa số điện thoại về 10 chữ số bắt đầu bằng 0.
// Nhận "+84…", "84…", có dấu cách, dấu chấm, gạch nối. Không chuẩn hóa được thì trả null.
function normalizePhone(raw) {
  if (raw === undefined || raw === null) return null;
  let digits = String(raw).replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+84')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('84') && digits.length === 11) digits = '0' + digits.slice(2);
  return /^0[0-9]{9}$/.test(digits) ? digits : null;
}

// QT-15: che số điện thoại dạng 090****567 cho người không phải Quản lý trung tâm.
function maskPhone(phone) {
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

module.exports = { normalizePhone, maskPhone };