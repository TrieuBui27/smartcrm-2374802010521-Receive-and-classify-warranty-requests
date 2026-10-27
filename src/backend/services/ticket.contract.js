// HỢP ĐỒNG DỮ LIỆU: một phiếu bảo hành trả từ lớp nghiệp vụ ra lớp API và giao diện.
// Tên trường snake_case, khớp docs/api-contract.md. Lớp trình bày CHỈ đọc các trường dưới đây, không đọc cột bảng.
//
// HÌNH DẠNG                      Ý NGHĨA
//   ticket_id         số         khóa phiếu, luôn có
//   ticket_code       chuỗi      dạng BH-000123/2026, luôn có
//   status            chuỗi      MOI, DA_PHAN_CONG, DANG_XU_LY, CHO_LINH_KIEN, HOAN_TAT, DA_DONG, DA_HUY
//   priority          chuỗi      CAO, TRUNG_BINH, THAP
//   category_name     chuỗi|null nhóm sự cố; null khi chưa phân loại
//   issue_desc        chuỗi      mô tả lỗi khách báo
//   accessories       mảng chuỗi phụ kiện kèm theo, mảng rỗng khi không có
//   customer_name     chuỗi      họ tên khách; "(không rõ)" khi hồ sơ khách không đọc được
//   customer_phone    chuỗi      che dạng 090****567 (QT-15), chỉ Quản lý trung tâm thấy đủ số
//   device_name       chuỗi      tên thiết bị; "(không rõ)" khi không đọc được
//   serial_no         chuỗi      số serial hoặc IMEI của thiết bị
//   center_id         số         trung tâm bảo hành đang giữ phiếu
//   received_at       chuỗi      ISO 8601 kèm +07:00, luôn có
//   due_date          chuỗi      hạn cam kết, ISO 8601 kèm +07:00, luôn có
//   closed_at         chuỗi|null ISO 8601 kèm +07:00; null khi phiếu chưa đóng
//   is_warranty       boolean    true = miễn phí; false = có tính phí HOẶC chưa xác minh (xem warranty_verified)
//   warranty_verified boolean    false khi thiếu ngày mua: giao diện hiển thị "Bảo hành chưa xác minh" (QT-05)
//   is_overdue        boolean    phiếu chưa hoàn tất mà đã quá hạn cam kết, tính lúc đọc
//
// KHI SAI: không tìm thấy phiếu thì NƠI GỌI báo NOT_FOUND, không gọi toTicketView. Trường tùy chọn thiếu thì
// trả null hoặc mảng rỗng đúng như bảng trên, KHÔNG BAO GIỜ trả undefined.
const { maskPhone } = require('./phone');

const UNKNOWN = '(không rõ)';
const NOT_OVERDUE_STATUSES = ['HOAN_TAT', 'DA_DONG', 'DA_HUY']; // đã làm xong thì không còn "quá hạn"

/**
 * Đổi một thời điểm sang chuỗi ISO 8601 giờ Việt Nam, ví dụ 2026-09-08T14:30:00+07:00.
 * @param {Date|string|null} value Thời điểm; null hoặc undefined thì trả null.
 * @returns {string|null}
 */
function toIsoVn(value) {
  if (value === null || value === undefined) return null;
  const d = new Date(value);
  return new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00';
}

/**
 * Chuyển một dòng phiếu (đã nối khách, thiết bị, nhóm sự cố) thành đối tượng đúng hợp đồng ở đầu file.
 * @param {object} row Dòng từ repository: các cột của ticket cùng customer_name, customer_phone,
 *   device_name, serial_no, category_name.
 * @param {{role: string}} viewer Người xem; chỉ QUAN_LY_TRUNG_TAM thấy đủ số điện thoại (QT-15).
 * @param {Date} [now] Thời điểm tính is_overdue; mặc định là lúc gọi.
 * @returns {object} Phiếu theo hợp đồng.
 */
function toTicketView(row, viewer, now = new Date()) {
  const overdue = !NOT_OVERDUE_STATUSES.includes(row.status) && new Date(row.due_date) < now;
  const phone = row.customer_phone;
  return {
    ticket_id: row.ticket_id,
    ticket_code: row.ticket_code,
    status: row.status,
    priority: row.priority,
    category_name: row.category_name ?? null,
    issue_desc: row.issue_desc,
    accessories: row.accessories ? row.accessories.split(',') : [],
    customer_name: row.customer_name ?? UNKNOWN,
    customer_phone: phone ? (viewer && viewer.role === 'QUAN_LY_TRUNG_TAM' ? phone : maskPhone(phone)) : null,
    device_name: row.device_name ?? UNKNOWN,
    serial_no: row.serial_no ?? null,
    center_id: row.center_id,
    received_at: toIsoVn(row.received_at),
    due_date: toIsoVn(row.due_date),
    closed_at: toIsoVn(row.closed_at),
    is_warranty: row.is_warranty,
    warranty_verified: row.warranty_verified,
    is_overdue: overdue,
  };
}

module.exports = { toTicketView, toIsoVn };