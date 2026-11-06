# Test Plan rút gọn – Smart CRM L2 (Bài tập 3, buổi 14)

Viết ngày 06/11/2026, **trước khi chạy** 12 test case của bộ `tests/tc.*.test.js`. Kết quả thật nằm ở `docs/test-report.md`, lỗi tìm được nằm ở `docs/bug-log.md`.

## 1. Phạm vi và chủ ý không kiểm

**Kiểm:** các quy tắc đắt giá nhất của luồng L2: hạn cam kết QT-04 (kể cả bỏ Chủ nhật), tình trạng bảo hành QT-05, vòng đời phiếu QT-06, đề xuất nhóm sự cố FR5, serial không trùng QT-03, không lập phiếu cho khách đã xóa QT-13, xác thực và khóa tài khoản (QT-14), kiểm tra dữ liệu vào, và ngày mua không lệch múi giờ (BUG-003).

**Chủ ý KHÔNG kiểm (và lý do):**
- Giao diện React bằng test tự động: đã kiểm bằng tay (ảnh trong `docs/screenshots/`), chi phí viết test giao diện lớn hơn lợi ích ở BT3.
- Hiệu năng và chịu tải: không có yêu cầu đo trong SRS L2.
- Docker Compose: đã kiểm bằng phép thử thư mục trống ở BT2, không lặp lại.
- Các luồng thuộc L1, L4, L5, L8, L10 (ngoài phạm vi L2).
- 70 test cũ vẫn chạy trong `npm test` nhưng không tính vào 12 test case của báo cáo này.

## 2. Loại test, số lượng và kỹ thuật chọn dữ liệu

| Tầng | Số test case | Làm gì | Mã |
|---|---|---|---|
| Unit (hàm thuần, không CSDL) | 7 | Hạn cam kết, bảo hành, đề xuất nhóm, vòng đời | TC-01 đến TC-07 |
| Integration (service thật + PostgreSQL thật) | 3 | Khách đã xóa mềm, ngày mua, serial trùng | TC-09, TC-10, TC-11 |
| API/System (HTTP thật vào backend thật) | 2 | Token của tài khoản bị khóa, mô tả lỗi sai | TC-08, TC-12 |

Tổng 12 test case, đủ 5 loại: luồng đúng (TC-01, 02, 06, 07), biên (TC-03 và TC-04, hai bên cùng một ranh giới), dữ liệu sai (TC-05, TC-11, TC-12), bảo mật/chất lượng (TC-08, TC-09), tái lập lỗi cũ (TC-10).

**Kỹ thuật chọn dữ liệu:** *phân vùng tương đương* cho mức ưu tiên (CAO/TRUNG_BINH/THAP hợp lệ, mọi giá trị khác không hợp lệ), cho vai trò và cho trạng thái; *giá trị biên* cho bảo hành (ngày hết hạn 06/11/2026 là còn, 07/11/2026 00:00 là hết, tức ≤ chứ không phải <), cho độ dài mô tả lỗi (9 ký tự bị từ chối, 10 hợp lệ) và cho ranh giới Chủ nhật.

## 3. Tiêu chí thành công (đo được, đặt trước)

1. 12/12 test case có kết quả thật, mỗi test case có ảnh chụp lúc chạy trong `docs/screenshots/TC-xx.png`.
2. Cuối buổi: 0 test case FAIL còn mở; mọi test case FAIL ban đầu được ghi thành bug trong Bug Log, sửa bằng **một commit riêng** cho mỗi bug.
3. Ít nhất 3 bug đã sửa, trong đó ít nhất 1 bug Critical hoặc Major.
4. Một lệnh `cd src/backend && npm test` cho kết quả **82 test, 0 fail** (70 test cũ + 12 test case mới).
5. Không test nào được sửa cho dễ qua: kỳ vọng của test case không đổi sau khi tìm ra bug.

## 4. Môi trường và dữ liệu thử

- Windows, Node.js 24, PostgreSQL 18, đã chạy `db:migrate` và `db:seed` (6 nhóm sự cố, 12 nhân viên, 139 khách, 25 thiết bị, 25 phiếu). Chạy lại trên CI (GitHub Actions, Ubuntu, Node 20, PostgreSQL 16).
- Dữ liệu seed chỉ đọc. Test tích hợp và test API tự tạo dòng riêng (khách "TC khach …", serial bắt đầu bằng `TC09-`, `TC10-`, `TC11-`, nhân viên `tc08_nv`, `tc12_nv`) và xóa sạch trong `finally`, nên chạy lại bao nhiêu lần cũng cho cùng kết quả.
- Ngày cố định trong test: thứ Hai 02/11/2026, thứ Bảy 07/11/2026 (đã đối chiếu lịch); không dùng giờ hệ thống làm kỳ vọng.
- Cần `.env` trỏ tới PostgreSQL; không có CSDL thì các test tích hợp và API tự bỏ qua (hiện "SKIP"), không báo sai là PASS.