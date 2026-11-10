# Checklist bảo mật – Smart CRM L2 (Tiếp nhận và phân loại yêu cầu bảo hành)

Bài tập 3, thành phần 5. Mỗi mục được điền bằng cách chạy thử trên bản tag `v1.0`, không bằng cách nhớ lại. Giá trị: ĐÃ LÀM / CHƯA LÀM / KHÔNG ÁP DỤNG, kèm một dòng minh chứng và ảnh chụp trong `docs/screenshots/`. Các lệnh chạy ở gốc repo (PowerShell), hệ thống đang chạy bằng `docker compose up -d --build`.

| # | Mục (OWASP 2025) | Giá trị | Ảnh |
|---|---|---|---|
| 1 | Không có secret nào trong repo (A02) | ĐÃ LÀM | `sec-1.png` |
| 2 | Dữ liệu vào được kiểm ở tầng ứng dụng (A05) | ĐÃ LÀM | `sec-2.png`, `TC-12.png` |
| 3 | Kiểm soát truy cập theo chủ sở hữu (A01) | ĐÃ LÀM | `sec-3.png`, `TC-08.png` |
| 4 | Mật khẩu và dữ liệu nhạy cảm được băm (A04, A07) | ĐÃ LÀM | `sec-4.png` |
| 5 | Thông báo lỗi không lộ cấu trúc bên trong (A10, A02) | ĐÃ LÀM | `sec-5.png` |
| 6 | Nhật ký không ghi secret, dữ liệu cá nhân (A09) | ĐÃ LÀM | `sec-6.png` |
| 7 | Phụ thuộc ghim phiên bản, đã kiểm lỗ hổng (A03) | ĐÃ LÀM | `sec-7.png` |

## 1. Không có secret nào trong repo – ĐÃ LÀM

Minh chứng: `git log --all --oneline -- .env` không in dòng nào (`.env` chưa từng được commit, `.gitignore` chặn nó). `git grep -niE '(password|secret|api_key)\w*\s*[:=]\s*.\w{8,}' -- src` chỉ ra 2 dòng, đều là mã đọc biến (`password_hash` trong `seed.js` và `bcrypt.compare` trong `auth.service.js`), không có giá trị secret nào. `.env.example` chỉ có giá trị mẫu (`doi_mat_khau_nay`); `ci.yml` chỉ có chuỗi dùng riêng cho CI. Mật khẩu demo `Mekong@2026` (tài khoản mẫu, ghi ở Deployment Guide mục 4) là công khai chủ ý.
Ảnh: `docs/screenshots/sec-1.png`.

## 2. Dữ liệu vào được kiểm ở tầng ứng dụng – ĐÃ LÀM

Minh chứng: mọi route gọi hàm trong `validators/` trước khi vào service, và trường được phép sửa nằm trong danh sách cho phép (khóa lạ như `is_active` bị bỏ qua); SQL luôn tham số hóa (`$1`, `$2`…). Lệnh grep tìm SQL ghép chuỗi ra các dòng dùng `${...}`; đã đọc từng dòng: chúng chỉ ghép danh sách cột và điều kiện do mã tạo (`COLS`, `VIEW_SELECT`, tên cột lấy từ danh sách cho phép, và tên bảng cố định trong `seed.js`), còn dữ liệu người dùng luôn nằm trong mảng tham số. Hai lệnh grep còn lại (`innerHTML`, `exec(`) không ra dòng nào. Dữ liệu sai: TC-12 (mô tả lỗi 9 ký tự) trả 400 `VALIDATION_FAILED`; tên đăng nhập `admin' OR '1'='1` trả 401 `INVALID_CREDENTIALS`, không đăng nhập được.
Giới hạn đã biết: id lớn hơn phạm vi `bigint` của PostgreSQL vẫn trả 500 (xem bảng rủi ro).
Ảnh: `docs/screenshots/sec-2.png`, `docs/screenshots/TC-12.png`.

## 3. Kiểm soát truy cập theo chủ sở hữu – ĐÃ LÀM

Minh chứng: phiếu chỉ xem và sửa được ở trung tâm của token (QT-14): bài test API "trung tâm khác 403" trong `tests/ticket.api.test.js` PASS; chạy tay, nhân viên trung tâm 4 gọi phiếu của trung tâm 5 nhận 403 `FORBIDDEN`. Vai trò và trung tâm lấy từ CSDL ở mỗi yêu cầu, không tin nội dung token: TC-08 (BUG-004) cho thấy token của tài khoản đã khóa nhận 401 ngay cả khi token còn hạn.
Ảnh: `docs/screenshots/sec-3.png`, `docs/screenshots/TC-08.png`.

## 4. Mật khẩu và dữ liệu nhạy cảm được băm – ĐÃ LÀM

Minh chứng: `SELECT username, left(password_hash, 30) FROM employee LIMIT 3` ra chuỗi dạng `$2b$10$…` (bcrypt, muối ngẫu nhiên, hệ số 10), không có cột mật khẩu rõ. Sai tên đăng nhập, sai mật khẩu và tài khoản bị khóa đều trả cùng một lỗi `INVALID_CREDENTIALS`. Số điện thoại khách được che dạng `090****567` với nhân viên tiếp nhận (QT-15) và được che trong log.
Ảnh: `docs/screenshots/sec-4.png`.

## 5. Thông báo lỗi không lộ cấu trúc bên trong – ĐÃ LÀM

Minh chứng: JSON hỏng trả 400 `VALIDATION_FAILED` "Body không phải JSON hợp lệ"; tắt CSDL (`docker compose stop db`) rồi đăng nhập trả 503 `DB_UNAVAILABLE` kèm `request_id`, không có stack, tên bảng hay chuỗi kết nối (TD-18, `tests/error-handler.test.js`). Tiêu đề `X-Powered-By: Express` đã tắt (`app.disable('x-powered-by')`, commit `d9fe5f7`).
Ảnh: `docs/screenshots/sec-5.png`.

## 6. Nhật ký không ghi secret, dữ liệu cá nhân – ĐÃ LÀM

Minh chứng: `docker compose logs api | Select-String -Pattern "password|token|0[0-9]{9}"` không ra dòng nào sau khi đã đăng nhập và tra cứu khách. Logger JSON (`logger.js`) che các khóa `password`, `token`, `authorization`, `secret`, `phone`, có test `tests/logger.test.js`; log ghi đường dẫn yêu cầu, không ghi nội dung thân yêu cầu.
Ảnh: `docs/screenshots/sec-6.png`.

## 7. Phụ thuộc ghim phiên bản, đã kiểm lỗ hổng – ĐÃ LÀM

Minh chứng: `package-lock.json` ở `src/backend` và `src/frontend` đã commit; Dockerfile và CI dùng `npm ci`. `npm audit --omit=dev` lần đầu báo 2 lỗ hổng ở backend (body-parser, qs), đã sửa bằng `npm audit fix` ở BUG-007 (commit `6cdb38b`); hiện cả hai thư mục báo `found 0 vulnerabilities`. Còn hạn chế: ảnh nền Docker ghim theo thẻ (`node:20-alpine`, `postgres:16-alpine`, `nginx:1.27-alpine`), chưa ghim theo digest.
Ảnh: `docs/screenshots/sec-7.png`.

## Rủi ro và giới hạn đã biết (chưa xử lý)

| Rủi ro | Mức | Vì sao chưa xử lý | Hướng xử lý |
|---|---|---|---|
| Đăng nhập chưa giới hạn số lần thử (A07) | Trung bình | Ngoài phạm vi L2 (quản lý tài khoản không làm) | Giới hạn tốc độ theo IP và tên đăng nhập |
| 12 tài khoản mẫu dùng chung mật khẩu demo | Thấp khi demo | Cần để người chấm đăng nhập ngay | Đổi `SEED_PASSWORD`, không nạp tài khoản mẫu ở môi trường thật |
| Token lưu trong `localStorage`, hiệu lực 8 giờ, không thu hồi khi đăng xuất | Trung bình | Chấp nhận ở mức prototype (TD-13); đã bù một phần bằng việc kiểm tra lại tài khoản mỗi yêu cầu (BUG-004) | Cookie `HttpOnly`; danh sách thu hồi token |
| Chạy HTTP, không TLS | Trung bình | Chạy thử trên máy cá nhân | Đặt sau proxy TLS (xem Deployment Guide mục 6) |
| Tham số id quá lớn (vượt `bigint`) trả 500 thay vì 400 | Thấp | Phát hiện khi thử đầu vào bất thường, không lộ dữ liệu | Thêm giới hạn tối đa vào validator id |
| Ảnh nền Docker ghim theo thẻ, không theo digest | Thấp | Đủ cho prototype | Ghim `image@sha256:…` |