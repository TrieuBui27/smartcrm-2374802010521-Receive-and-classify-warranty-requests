// Kiểm tra định dạng dữ liệu vào của API phiếu (docs/api-contract.md mục 3 và 4).
// Mỗi hàm trả { errors: { tên_trường: thông_báo }, value }; errors rỗng nghĩa là hợp lệ.
const STATUSES = ['MOI', 'DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY'];
const INT = /^[0-9]+$/;

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

module.exports = { STATUSES, validateListQuery };