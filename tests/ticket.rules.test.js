// Kiểm thử các quy tắc phiếu bảo hành dạng hàm thuần: QT-04, QT-05, QT-06 và FR5. Không cần CSDL.
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/backend/services/ticket.rules');

const vn = s => new Date(`${s}+07:00`); // viết thời điểm theo giờ Việt Nam cho dễ đọc

test('QT-04 luồng đúng: CAO 24 giờ, TRUNG_BINH 72 giờ, THAP 120 giờ khi không vướng Chủ nhật', () => {
  const t = vn('2026-09-07T09:00:00');                                  // Thứ Hai
  assert.deepEqual(rules.computeDueDate(t, 'CAO'), vn('2026-09-08T09:00:00'));
  assert.deepEqual(rules.computeDueDate(t, 'TRUNG_BINH'), vn('2026-09-10T09:00:00'));
  assert.deepEqual(rules.computeDueDate(t, 'THAP'), vn('2026-09-12T09:00:00'));
});

test('QT-04 giá trị biên: hạn đi qua Chủ nhật thì cộng thêm 24 giờ; tiếp nhận Chủ nhật tính từ 00:00 Thứ Hai', () => {
  assert.deepEqual(rules.computeDueDate(vn('2026-09-12T10:00:00'), 'CAO'), vn('2026-09-14T10:00:00'));  // Thứ Bảy → Thứ Hai
  assert.deepEqual(rules.computeDueDate(vn('2026-09-13T15:00:00'), 'CAO'), vn('2026-09-15T00:00:00'));  // Chủ nhật
});

test('QT-05 giá trị biên: đúng ngày hết hạn vẫn còn bảo hành, qua một ngày thì hết; thiếu ngày mua là chưa xác minh', () => {
  assert.deepEqual(rules.checkWarranty('2025-09-08', 12, vn('2026-09-08T23:00:00')), { is_warranty: true, warranty_verified: true });
  assert.deepEqual(rules.checkWarranty('2025-09-08', 12, vn('2026-09-09T08:00:00')), { is_warranty: false, warranty_verified: true });
  assert.deepEqual(rules.checkWarranty(null, 12, vn('2026-09-09T08:00:00')), { is_warranty: false, warranty_verified: false });
  assert.equal(rules.addMonths('2026-01-31', 1), '2026-02-28');          // ngày 31 không có trong tháng 2
});

test('QT-06: chỉ đi tới theo vòng đời; Nhân viên tiếp nhận chỉ được đóng hoặc hủy', () => {
  assert.equal(rules.canTransition('MOI', 'DA_PHAN_CONG'), true);
  assert.equal(rules.canTransition('HOAN_TAT', 'DANG_XU_LY'), false);   // quay lại
  assert.equal(rules.canTransition('DA_DONG', 'DA_HUY'), false);        // phiếu đã đóng
  assert.deepEqual(rules.allowedTargets('MOI', 'NHAN_VIEN_TIEP_NHAN'), ['DA_HUY']);
  assert.deepEqual(rules.allowedTargets('DANG_XU_LY', 'QUAN_LY_TRUNG_TAM'), ['CHO_LINH_KIEN', 'HOAN_TAT']);
});

test('FR5: mô tả có dấu hoặc không dấu đều khớp từ khóa; không khớp thì về nhóm KHAC', () => {
  const cats = [
    { category_id: 1, category_name: 'MAN_HINH', keywords: 'man hinh,soc man', default_priority: 'CAO' },
    { category_id: 3, category_name: 'SAC', keywords: 'sac,cong sac', default_priority: 'TRUNG_BINH' },
    { category_id: 6, category_name: 'KHAC', keywords: null, default_priority: 'THAP' },
  ];
  // Hai mô tả lấy nguyên văn từ tickets_history.csv.
  assert.equal(rules.suggestCategory('may bi màn hình bị sọc dọc bị từ tuần trước', cats).category_name, 'MAN_HINH');
  assert.equal(rules.suggestCategory('kh noi cam sac khong vao dien bi tu tuan truoc', cats).category_name, 'SAC');
  assert.deepEqual(rules.suggestCategory('máy kêu lạ khi gọi điện', cats), { category_id: 6, category_name: 'KHAC', priority: 'THAP' });
});