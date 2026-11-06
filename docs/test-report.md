# Test Report – Smart CRM L2 (Bài tập 3, buổi 14)

Chạy ngày 06/11/2026 trên máy của em (Windows, Node.js 24, PostgreSQL 18, đã `db:migrate` và `db:seed`). Test Plan đặt tiêu chí từ trước ở [`test-plan.md`](test-plan.md). Mã nguồn test: `tests/tc.unit.test.js`, `tests/tc.integration.test.js`, `tests/tc.api.test.js`.

**Cách chạy lại một test case bất kỳ** (cho giảng viên kiểm tra ngẫu nhiên), trong `src/backend`:

```
node --test --test-name-pattern="TC-08 " ../../tests/tc.unit.test.js ../../tests/tc.integration.test.js ../../tests/tc.api.test.js
```

Chạy cả bộ bằng một lệnh: `cd src/backend && npm test`. Kết quả cuối: **82 test, 82 pass, 0 fail** (70 test cũ và 12 test case dưới đây), ảnh [`npm-test-82-pass.png`](screenshots/npm-test-82-pass.png).

## 1. Tóm tắt

| Lần chạy | Commit | PASS | FAIL |
|---|---|---|---|
| Lần 1, trước khi sửa | `8b04b71` | 9 | 3 (TC-08, TC-09, TC-11) |
| Sau khi sửa 3 bug | `b896bd0` | 12 | 0 |

Kim tự tháp: **7 unit** (TC-01 đến TC-07), **3 integration** (TC-09, TC-10, TC-11), **2 API** (TC-08, TC-12). Đủ 5 loại: luồng đúng (TC-01, 02, 06, 07), biên (TC-03 và TC-04, hai bên cùng ranh giới ngày hết hạn bảo hành), dữ liệu sai (TC-05, TC-11, TC-12), bảo mật hoặc chất lượng dữ liệu (TC-08, TC-09), tái lập lỗi cũ (TC-10, BUG-003).

## 2. Các test case

Mỗi test case có ảnh chạy thật trong `docs/screenshots/`. Ba test case FAIL lần 1 có thêm ảnh `TC-xx-truoc-sua.png`.

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi (kèm tác dụng phụ) | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| TC-01 luồng đúng | Hàm thuần `computeDueDate`, không cần CSDL | Gọi `computeDueDate(thời điểm, 'CAO')` | Thứ Hai 02/11/2026 09:00 (+07:00), mức CAO | Hạn là Thứ Ba 03/11/2026 09:00 (+07:00). Không tác dụng phụ (hàm thuần) | Cao | Trả đúng 03/11/2026 09:00 (+07:00). [TC-01.png](screenshots/TC-01.png) | PASS |
| TC-02 luồng đúng, ngày Chủ nhật | Như TC-01 | Gọi `computeDueDate` với thời điểm Thứ Bảy | Thứ Bảy 07/11/2026 10:00, mức CAO (24 giờ) | Chủ nhật không tính giờ nên hạn là Thứ Hai 09/11/2026 10:00. Không tác dụng phụ | Cao | Trả đúng Thứ Hai 09/11/2026 10:00. [TC-02.png](screenshots/TC-02.png) | PASS |
| TC-03 biên (trong) | Hàm thuần `checkWarranty` | Gọi `checkWarranty(ngày mua, số tháng, thời điểm tiếp nhận)` | Mua 06/11/2025, 12 tháng, tiếp nhận 06/11/2026 23:59 (đúng ngày hết hạn) | `is_warranty = true`, `warranty_verified = true` (so sánh ≤, đúng ngày vẫn còn bảo hành) | Cao | `{ is_warranty: true, warranty_verified: true }`. [TC-03.png](screenshots/TC-03.png) | PASS |
| TC-04 biên (ngoài) | Như TC-03, cùng ranh giới | Gọi `checkWarranty` ngay sau ranh giới | Cùng thiết bị, tiếp nhận 07/11/2026 00:00 (muộn 1 phút so với TC-03) | `is_warranty = false`, `warranty_verified = true` | Cao | `{ is_warranty: false, warranty_verified: true }`. [TC-04.png](screenshots/TC-04.png) | PASS |
| TC-05 dữ liệu sai | Hàm thuần `computeDueDate` | Gọi với mức ưu tiên ngoài ba giá trị hợp lệ | Thời điểm 02/11/2026 09:00, mức `KHAN_CAP` | Ném `RangeError` có thông báo đúng `Mức ưu tiên không hợp lệ: KHAN_CAP`; không trả về ngày nào | Trung bình | Ném `RangeError`, thông báo khớp từng chữ. [TC-05.png](screenshots/TC-05.png) | PASS |
| TC-06 luồng đúng, phân loại | Danh mục 3 nhóm MAN_HINH (CAO), PIN, KHAC | Gọi `suggestCategory(mô tả, danh mục)` | Mô tả `Màn hình bị vỡ sau khi rơi` | `{ category_id: 1, category_name: 'MAN_HINH', priority: 'CAO' }` | Trung bình | Đúng như mong đợi (khớp có dấu, không cần gõ không dấu). [TC-06.png](screenshots/TC-06.png) | PASS |
| TC-07 luồng đúng, vòng đời | Hàm thuần của QT-06 | Gọi `canTransition` và `allowedTargets` | Từ DA_DONG sang MOI; Nhân viên tiếp nhận ở trạng thái MOI | `canTransition = false` (không quay lại); `allowedTargets = ['DA_HUY']` | Trung bình | `false` và `['DA_HUY']`. [TC-07.png](screenshots/TC-07.png) | PASS |
| TC-08 bảo mật (API) | Backend thật, CSDL đã seed; nhân viên thử `tc08_nv` (trung tâm 1) đang hoạt động | 1) Đăng nhập. 2) `GET /api/tickets` với token. 3) Khóa tài khoản (`is_active = false`). 4) `GET /api/tickets` lại với cùng token | `tc08_nv` / `Mekong@2026` | Bước 2: 200. Bước 4: **401** `UNAUTHORIZED`, không trả danh sách phiếu | Cao (Critical) | Lần 1 (`8b04b71`): bước 4 trả **200**, báo `200 !== 401`, vẫn đọc được dữ liệu. Sau khi sửa (`d335bfc`): 401 `UNAUTHORIZED`. [TC-08-truoc-sua.png](screenshots/TC-08-truoc-sua.png), [TC-08.png](screenshots/TC-08.png) | FAIL lần 1, PASS sau sửa (BUG-004) |
| TC-09 chất lượng dữ liệu (integration) | CSDL thật; tạo khách riêng và một thiết bị `TC09-SN-0001` chưa có phiếu; sau đó xóa mềm khách | Gọi `TicketService.create` cho thiết bị đó rồi đếm phiếu của khách | `issue_desc` = `man hinh bi vo sau khi roi`, nhân viên trung tâm 1 | Ném `CUSTOMER_NOT_FOUND` (hoặc `NOT_FOUND`); bảng `ticket` không có dòng nào của khách đó | Cao (Major) | Lần 1 (`8b04b71`): **không ném lỗi** (`Missing expected rejection`), phiếu được lưu. Sau khi sửa (`25c20ba`): ném `CUSTOMER_NOT_FOUND`, 0 phiếu. [TC-09-truoc-sua.png](screenshots/TC-09-truoc-sua.png), [TC-09.png](screenshots/TC-09.png) | FAIL lần 1, PASS sau sửa (BUG-005) |
| TC-10 tái lập lỗi cũ (integration) | CSDL thật; khách riêng; ngày giả lập hôm nay là 2026-11-06 | Tạo thiết bị với ngày mua rồi đọc lại bằng `getById` và qua JSON | Serial `TC10-SN-0001`, ngày mua `2026-11-06`, 12 tháng | Ngày mua đọc lại luôn là `2026-11-06` (không lùi thành 11-05 như BUG-003); dữ liệu tạo ra bị xóa sạch ở cuối | Trung bình | Cả 3 lần đọc đều là `2026-11-06`. [TC-10.png](screenshots/TC-10.png) | PASS |
| TC-11 dữ liệu sai (integration) | CSDL thật; khách riêng đã có thiết bị `TC11-SN-0001` | Tạo thiết bị thứ hai chỉ khác hoa thường rồi đếm thiết bị | Serial `tc11-sn-0001` | Ném `SERIAL_EXISTS` với thông báo `Serial/IMEI đã thuộc một thiết bị khác (QT-03)`; khách chỉ còn đúng 1 thiết bị | Cao (Major) | Lần 1 (`8b04b71`): **không ném lỗi**, lưu thành 2 thiết bị. Sau khi sửa (`b896bd0`): ném `SERIAL_EXISTS` đúng thông báo, còn 1 thiết bị. [TC-11-truoc-sua.png](screenshots/TC-11-truoc-sua.png), [TC-11.png](screenshots/TC-11.png) | FAIL lần 1, PASS sau sửa (BUG-006) |
| TC-12 dữ liệu sai (API) | Backend thật; nhân viên thử `tc12_nv` đã đăng nhập | `POST /api/tickets` với mô tả lỗi 9 ký tự (dưới ngưỡng 10) | `{ customer_id: 1, device_id: 1, issue_desc: '123456789' }` | HTTP 400, `error.code = VALIDATION_FAILED`, `error.fields.issue_desc = 'Mô tả lỗi phải có từ 10 đến 2000 ký tự'`; không tạo phiếu | Trung bình | 400, `VALIDATION_FAILED`, thông báo theo ô khớp từng chữ. [TC-12.png](screenshots/TC-12.png) | PASS |

## 3. Liên hệ với Bug Log

| Bug | Mức độ | Phát hiện bởi | Commit sửa |
|---|---|---|---|
| BUG-004 | Critical | TC-08 | `d335bfc` |
| BUG-005 | Major | TC-09 | `25c20ba` |
| BUG-006 | Major | TC-11 | `b896bd0` |

Chi tiết từng bug (triệu chứng, cách tái lập, nguyên nhân, cách sửa) ở [`bug-log.md`](bug-log.md). Kỳ vọng của TC-08, TC-09, TC-11 không bị đổi sau khi tìm ra bug: test đã commit ở `8b04b71` ở trạng thái đỏ, rồi mỗi bug được sửa trong code bằng một commit riêng.

## 4. Đối chiếu tiêu chí thành công của Test Plan

| Tiêu chí đặt trước | Kết quả |
|---|---|
| 12/12 test case có kết quả thật và ảnh chụp | Đạt (12 ảnh, thêm 3 ảnh trước khi sửa) |
| Mọi test case FAIL ban đầu thành bug, mỗi bug một commit | Đạt (3 FAIL thành BUG-004, 005, 006; 3 commit riêng) |
| Ít nhất 3 bug đã sửa, có Critical hoặc Major | Đạt (1 Critical, 2 Major) |
| `npm test` cho 82 test, 0 fail bằng một lệnh | Đạt (82/82) |
| Không sửa kỳ vọng test cho dễ qua | Đạt (test giữ nguyên từ commit `8b04b71`) |