// Kiểm tra định dạng dữ liệu vào của API phiếu (docs/api-contract.md mục 3 và 4).
// Mỗi hàm trả { errors: { tên_trường: thông_báo }, value }; errors rỗng nghĩa là hợp lệ.
const STATUSES = ['MOI', 'DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY'];
const INT = /^[0-9]+$/;
const PRIORITIES = ['CAO', 'TRUNG_BINH', 'THAP'];
const ACCESSORIES = ['SAC', 'TAI_NGHE', 'HOP', 'KHAC'];
const isPositiveInt = v => Number.isInteger(v) && v >= 1;

/**
 * Kiểm tra tham số của GET /api/tickets. Query string luôn là chuỗi nên đổi sang số và boolean ở đây.
 * @param {object} q req.query: status, overdue, page, size, center_id (đều tùy chọn).
 * @returns {{errors: object, value: object}} value có page (mặc định 1) và size (mặc định 20, tối đa 100).
 */
function validateListQuery(q = {}) {
  const errors = {}, value = {};
  if (q.status !== undefined) {
    if (!STATUSES.includes(q.status)) errors.status = 'Trạng thái không hợp lệ';
    else value.status = q.status;
  }
  if (q.overdue !== undefined) {
    if (!['true', 'false'].includes(q.overdue)) errors.overdue = 'overdue chỉ nhận true hoặc false';
    else value.overdue = q.overdue === 'true';
  }
  if (q.center_id !== undefined) {
    if (!INT.test(q.center_id) || Number(q.center_id) < 1) errors.center_id = 'Trung tâm bảo hành không hợp lệ';
    else value.center_id = Number(q.center_id);
  }
  const page = q.page === undefined ? 1 : INT.test(q.page) ? Number(q.page) : NaN;
  if (!(page >= 1)) errors.page = 'page phải là số nguyên từ 1';
  else value.page = page;
  const size = q.size === undefined ? 20 : INT.test(q.size) ? Number(q.size) : NaN;
  if (!(size >= 1 && size <= 100)) errors.size = 'size phải là số nguyên từ 1 đến 100';
  else value.size = size;
  return { errors, value };
}

const checkIssueDesc = (v, errors) => {
  const len = typeof v === 'string' ? v.trim().length : 0;
  if (len < 10 || len > 2000) errors.issue_desc = 'Mô tả lỗi phải có từ 10 đến 2000 ký tự';
};

/**
 * Kiểm tra body của POST /api/tickets theo bảng validation (api-contract mục 4). Chỉ kiểm tra định dạng;
 * việc khách và thiết bị có tồn tại, thiết bị có thuộc khách không là của service.
 * @returns {object} { tên_trường: thông_báo }; rỗng nghĩa là hợp lệ.
 */
function validateCreate(body) {
  const b = body || {};
  const errors = {};
  if (!isPositiveInt(b.customer_id)) errors.customer_id = 'Không tìm thấy khách hàng';
  if (!isPositiveInt(b.device_id)) errors.device_id = 'Thiết bị là bắt buộc';
  checkIssueDesc(b.issue_desc, errors);
  if (b.center_id != null && !isPositiveInt(b.center_id)) errors.center_id = 'Trung tâm bảo hành không hợp lệ';
  if (b.category_id != null && !isPositiveInt(b.category_id)) errors.category_id = 'Nhóm sự cố không hợp lệ';
  if (b.priority != null && !PRIORITIES.includes(b.priority)) errors.priority = 'Mức ưu tiên không hợp lệ';
  if (b.accessories != null) {
    const ok = Array.isArray(b.accessories) && b.accessories.every(a => ACCESSORIES.includes(a))
      && new Set(b.accessories).size === b.accessories.length;
    if (!ok) errors.accessories = 'Phụ kiện không hợp lệ';
  }
  return errors;
}

/** Kiểm tra body của POST /api/tickets/suggestion: chỉ cần issue_desc 10–2000 ký tự. */
function validateSuggestion(body) {
  const errors = {};
  checkIssueDesc((body || {}).issue_desc, errors);
  return errors;
}

/** Kiểm tra body của PATCH /api/tickets/:id/status: to_status thuộc 7 trạng thái, note (nếu có) tối đa 255 ký tự. */
function validateStatusChange(body) {
  const b = body || {};
  const errors = {};
  if (!STATUSES.includes(b.to_status)) errors.to_status = 'Trạng thái đích không hợp lệ';
  if (b.note != null && (typeof b.note !== 'string' || b.note.length > 255)) errors.note = 'Ghi chú tối đa 255 ký tự';
  return errors;
}

module.exports = { STATUSES, validateListQuery, validateCreate, validateSuggestion, validateStatusChange };