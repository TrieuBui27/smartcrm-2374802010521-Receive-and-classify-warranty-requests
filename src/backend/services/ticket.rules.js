// Quy tắc nghiệp vụ của phiếu bảo hành, viết thành hàm thuần (không CSDL, không HTTP) để kiểm thử riêng.
// Thời điểm trong hệ thống là giờ Việt Nam (UTC+7, không có giờ mùa hè).
const VN_OFFSET = 7 * 3600e3;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

// QT-04: số giờ cam kết theo mức ưu tiên.
const DUE_HOURS = { CAO: 24, TRUNG_BINH: 72, THAP: 120 };

// QT-06: vòng đời phiếu (Hình 6.2 case study). Không có đường quay lại.
const TRANSITIONS = {
  MOI: ['DA_PHAN_CONG', 'DA_HUY'],
  DA_PHAN_CONG: ['DANG_XU_LY', 'DA_HUY'],
  DANG_XU_LY: ['CHO_LINH_KIEN', 'HOAN_TAT'],
  CHO_LINH_KIEN: ['HOAN_TAT'],
  HOAN_TAT: ['DA_DONG'],
  DA_DONG: [],
  DA_HUY: [],
};
// UC7 3b: Nhân viên tiếp nhận chỉ được đóng hoặc hủy phiếu; Quản lý trung tâm cập nhật thay kỹ thuật viên (A4).
const ROLE_TARGETS = {
  NHAN_VIEN_TIEP_NHAN: ['DA_DONG', 'DA_HUY'],
  QUAN_LY_TRUNG_TAM: ['DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY'],
};
const CLOSED = ['DA_DONG', 'DA_HUY'];

/**
 * Tính hạn cam kết của phiếu (QT-04): cộng 24 / 72 / 120 giờ theo mức ưu tiên, Chủ nhật không tính giờ.
 * @param {Date|string} receivedAt Thời điểm tiếp nhận.
 * @param {'CAO'|'TRUNG_BINH'|'THAP'} priority Mức ưu tiên.
 * @returns {Date} Hạn cam kết. Tiếp nhận vào Chủ nhật thì bắt đầu tính từ 00:00 Thứ Hai.
 * @throws {RangeError} Khi mức ưu tiên không thuộc ba giá trị trên (lỗi dữ liệu, không phải lỗi người dùng).
 */
function computeDueDate(receivedAt, priority) {
  if (!DUE_HOURS[priority]) throw new RangeError(`Mức ưu tiên không hợp lệ: ${priority}`);
  let remaining = DUE_HOURS[priority] * HOUR;
  // Dời sang "giờ Việt Nam biểu diễn như UTC" để ranh giới ngày đúng 00:00 giờ Việt Nam.
  let t = new Date(receivedAt).getTime() + VN_OFFSET;
  while (remaining > 0) {
    const dayStart = Math.floor(t / DAY) * DAY;
    if (new Date(dayStart).getUTCDay() === 0) { t = dayStart + DAY; continue; } // Chủ nhật: nhảy qua
    const step = Math.min(remaining, dayStart + DAY - t);
    t += step;
    remaining -= step;
  }
  return new Date(t - VN_OFFSET);
}

// Cộng tháng cho ngày 'YYYY-MM-DD'; ngày không tồn tại thì lùi về cuối tháng (31/01 + 1 tháng = 28/02).
function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

/**
 * Kiểm tra tình trạng bảo hành (QT-05, UC8).
 * @param {string|null} purchaseDate Ngày mua 'YYYY-MM-DD'; null khi khách không có hóa đơn.
 * @param {number} warrantyMonths Số tháng bảo hành của thiết bị.
 * @param {Date|string} receivedAt Thời điểm tiếp nhận.
 * @returns {{is_warranty: boolean, warranty_verified: boolean}}
 *   Thiếu ngày mua (UC3 6b): warranty_verified = false và is_warranty = false, tức chưa được miễn phí
 *   cho tới khi xác minh; hệ thống không tự quyết là còn bảo hành.
 */
function checkWarranty(purchaseDate, warrantyMonths, receivedAt) {
  if (!purchaseDate) return { is_warranty: false, warranty_verified: false };
  const received = new Date(new Date(receivedAt).getTime() + VN_OFFSET).toISOString().slice(0, 10);
  // So sánh chuỗi YYYY-MM-DD đúng thứ tự thời gian; đúng ngày hết hạn vẫn còn bảo hành (≤).
  return { is_warranty: received <= addMonths(purchaseDate, warrantyMonths), warranty_verified: true };
}

// Bỏ dấu, chữ thường, chỉ giữ chữ và số để so khớp với từ khóa không dấu trong issue_category.keywords.
const plain = s => String(s || '').toLowerCase().replace(/đ/g, 'd').normalize('NFD')
  .replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Đề xuất nhóm sự cố và mức ưu tiên từ mô tả lỗi bằng luật từ khóa (FR5, UC4). L2 không dùng học máy (L10).
 * @param {string} issueDesc Mô tả lỗi người dùng nhập.
 * @param {Array<{category_id:number, category_name:string, keywords:string|null, default_priority:string}>} categories
 * @returns {{category_id:number, category_name:string, priority:string}|null}
 *   Nhóm khớp nhiều từ khóa nhất; hòa thì lấy category_id nhỏ hơn; không khớp từ nào thì nhóm KHAC.
 *   null khi danh mục không có nhóm KHAC và không nhóm nào khớp.
 */
function suggestCategory(issueDesc, categories) {
  const text = ` ${plain(issueDesc)} `;
  let best = null, bestHits = 0;
  for (const c of [...categories].sort((a, b) => a.category_id - b.category_id)) {
    const hits = String(c.keywords || '').split(',').map(plain).filter(k => k && text.includes(` ${k} `)).length;
    if (hits > bestHits) { best = c; bestHits = hits; }
  }
  best = best || categories.find(c => c.category_name === 'KHAC');
  return best ? { category_id: best.category_id, category_name: best.category_name, priority: best.default_priority } : null;
}

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
const roleCanMoveTo = (role, to) => (ROLE_TARGETS[role] || []).includes(to);
// UC7 bước 2: các trạng thái đích hiển thị cho người dùng theo vòng đời và vai trò.
const allowedTargets = (from, role) => (TRANSITIONS[from] || []).filter(to => roleCanMoveTo(role, to));
const isOpen = status => !CLOSED.includes(status);

module.exports = {
  DUE_HOURS, TRANSITIONS, computeDueDate, addMonths, checkWarranty, suggestCategory,
  canTransition, roleCanMoveTo, allowedTargets, isOpen,
};