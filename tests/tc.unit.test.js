// Buổi 14 (BT3), tầng UNIT: 7 test case TC-01 đến TC-07 của Test Report (docs/test-report.md).
// Hàm thuần, không CSDL, không HTTP. Mỗi test ghi rõ dữ liệu vào và kết quả mong đợi cụ thể.
const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/backend/services/ticket.rules');

const CATEGORIES = [
  { category_id: 1, category_name: 'MAN_HINH', keywords: 'man hinh,vo man,soc man', default_priority: 'CAO' },
  { category_id: 2, category_name: 'PIN', keywords: 'pin,hao pin,sut pin', default_priority: 'TRUNG_BINH' },
  { category_id: 6, category_name: 'KHAC', keywords: null, default_priority: 'TRUNG_BINH' },
];

// TC-01 luồng đúng: QT-04, ưu tiên CAO cộng 24 giờ.
test('TC-01 hạn cam kết CAO tiếp nhận Thứ Hai 09:00 là Thứ Ba 09:00', () => {
  const due = rules.computeDueDate('2026-11-02T09:00:00+07:00', 'CAO'); // 02/11/2026 là Thứ Hai
  assert.equal(due.toISOString(), new Date('2026-11-03T09:00:00+07:00').toISOString());
});

// TC-02 luồng đúng (nhánh Chủ nhật): giờ rơi vào Chủ nhật không được tính.
test('TC-02 hạn cam kết CAO tiếp nhận Thứ Bảy 10:00 nhảy qua Chủ nhật tới Thứ Hai 10:00', () => {
  const due = rules.computeDueDate('2026-11-07T10:00:00+07:00', 'CAO'); // 07/11/2026 là Thứ Bảy
  assert.equal(due.toISOString(), new Date('2026-11-09T10:00:00+07:00').toISOString());
});

// TC-03 biên bên trong: đúng ngày hết hạn vẫn còn bảo hành (QT-05, so sánh ≤).
test('TC-03 biên: mua 06/11/2025, 12 tháng, tiếp nhận đúng 06/11/2026 23:59 vẫn còn bảo hành', () => {
  const r = rules.checkWarranty('2025-11-06', 12, '2026-11-06T23:59:00+07:00');
  assert.deepEqual(r, { is_warranty: true, warranty_verified: true });
});

// TC-04 biên bên ngoài, cùng ranh giới với TC-03: hơn một phút là hết hạn.
test('TC-04 biên: cùng thiết bị, tiếp nhận 07/11/2026 00:00 (sau ranh giới 1 phút) hết bảo hành', () => {
  const r = rules.checkWarranty('2025-11-06', 12, '2026-11-07T00:00:00+07:00');
  assert.deepEqual(r, { is_warranty: false, warranty_verified: true });
});

// TC-05 dữ liệu sai: mức ưu tiên ngoài ba giá trị, kiểm cả loại lỗi lẫn thông báo.
test('TC-05 dữ liệu sai: mức ưu tiên KHAN_CAP bị từ chối bằng RangeError có thông báo rõ', () => {
  assert.throws(
    () => rules.computeDueDate('2026-11-02T09:00:00+07:00', 'KHAN_CAP'),
    err => err instanceof RangeError && err.message === 'Mức ưu tiên không hợp lệ: KHAN_CAP');
});

// TC-06 luồng đúng: FR5, đề xuất nhóm sự cố từ mô tả có dấu.
test('TC-06 đề xuất: "Màn hình bị vỡ sau khi rơi" ra nhóm MAN_HINH, ưu tiên CAO', () => {
  const s = rules.suggestCategory('Màn hình bị vỡ sau khi rơi', CATEGORIES);
  assert.deepEqual(s, { category_id: 1, category_name: 'MAN_HINH', priority: 'CAO' });
});

// TC-07 luồng đúng (quy tắc vòng đời): QT-06 không có đường quay lại.
test('TC-07 vòng đời: phiếu Đã đóng không quay lại Mới, Nhân viên tiếp nhận từ Mới chỉ được Hủy', () => {
  assert.equal(rules.canTransition('DA_DONG', 'MOI'), false);
  assert.deepEqual(rules.allowedTargets('MOI', 'NHAN_VIEN_TIEP_NHAN'), ['DA_HUY']);
});