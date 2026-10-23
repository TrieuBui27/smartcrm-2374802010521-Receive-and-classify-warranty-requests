// Kiểm tra định dạng dữ liệu vào theo bảng validation (docs/api-contract.md mục 5).
// Trả về object { tên_trường: thông_báo }; rỗng nghĩa là hợp lệ.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkFields(body, { partial }) {
  const errors = {};
  const has = k => body[k] !== undefined;
  if (!partial || has('full_name')) {
    const v = body.full_name;
    if (typeof v !== 'string' || v.trim().length < 1 || v.length > 120) errors.full_name = 'Họ tên là bắt buộc (1–120 ký tự)';
  }
  if (!partial || has('phone')) {
    if (typeof body.phone !== 'string' || body.phone.trim() === '') errors.phone = 'Số điện thoại là bắt buộc';
  }
  if (has('email') && body.email !== null) {
    if (typeof body.email !== 'string' || body.email.length > 120 || !EMAIL.test(body.email)) errors.email = 'Email không hợp lệ';
  }
  if (has('address') && body.address !== null) {
    if (typeof body.address !== 'string' || body.address.length > 255) errors.address = 'Địa chỉ tối đa 255 ký tự';
  }
  return errors;
}

const validateCreate = body => checkFields(body || {}, { partial: false });

function validateUpdate(body) {
  const errors = checkFields(body || {}, { partial: true });
  if (!['full_name', 'phone', 'email', 'address'].some(k => body && body[k] !== undefined)) {
    errors._ = 'Cần ít nhất một trường để cập nhật';
  }
  return errors;
}

module.exports = { validateCreate, validateUpdate };