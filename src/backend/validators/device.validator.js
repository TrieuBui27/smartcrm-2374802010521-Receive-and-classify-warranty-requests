// Kiểm tra định dạng dữ liệu thiết bị theo bảng validation (docs/api-contract.md mục 5).
// Trả về object { tên_trường: thông_báo }; rỗng nghĩa là hợp lệ. `today` là ngày hôm nay dạng YYYY-MM-DD.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Ngày có thật (loại 2026-02-30): đổi qua lại Date mà vẫn ra đúng chuỗi ban đầu.
const isRealDate = v => DATE.test(v) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

function checkFields(body, today, { partial }) {
  const errors = {};
  const has = k => body[k] !== undefined;
  if (!partial || has('device_name')) {
    const v = body.device_name;
    if (typeof v !== 'string' || !v.trim() || v.length > 120) errors.device_name = 'Tên thiết bị là bắt buộc (1–120 ký tự)';
  }
  if (!partial || has('serial_no')) {
    const v = body.serial_no;
    if (typeof v !== 'string' || !v.trim() || v.trim().length > 50) errors.serial_no = 'Serial/IMEI là bắt buộc (1–50 ký tự)';
  }
  if (has('purchase_date') && body.purchase_date !== null) {
    const v = body.purchase_date;
    if (typeof v !== 'string' || !isRealDate(v) || v > today) errors.purchase_date = 'Ngày mua không hợp lệ (YYYY-MM-DD, không sau hôm nay)';
  }
  if (has('warranty_months')) {
    const v = body.warranty_months;
    if (!Number.isInteger(v) || v < 1 || v > 60) errors.warranty_months = 'Số tháng bảo hành phải là số nguyên từ 1 đến 60';
  }
  return errors;
}

const validateCreate = (body, today) => checkFields(body || {}, today, { partial: false });

function validateUpdate(body, today) {
  const errors = checkFields(body || {}, today, { partial: true });
  if (!['device_name', 'serial_no', 'purchase_date', 'warranty_months'].some(k => body && body[k] !== undefined)) {
    errors._ = 'Cần ít nhất một trường để cập nhật';
  }
  return errors;
}

module.exports = { validateCreate, validateUpdate };