# Nhật ký thay đổi thiết kế

Mỗi thay đổi có mã TD-xx để nhắc lại về sau. Mỗi điểm ghi bốn dòng: **phản hồi → quyết định → lý do → ảnh hưởng**. File này được nối tiếp ở BT2 và BT3; phạm vi luồng L2 và track SE giữ nguyên.

## Sau phản hồi Bài tập 1 (buổi 8, ngày 23/10/2026)

Điểm BT1: 8.5/10 (Đầy đủ 9 · Kỹ thuật 8 · Nhất quán 9.25 · Trình bày 7). Năm điểm cần khắc phục và hai gợi ý cho BT2 được xử lý như sau.

### TD-01 Bổ sung bảng thuật ngữ vào Mục 1
- **Phản hồi của GV:** Mục 1 thiếu BẢNG THUẬT NGỮ bắt buộc (phiếu bảo hành, hạn cam kết, nhóm sự cố, nhật ký trạng thái...).
- **Quyết định:** SỬA
- **Lý do:** Bảng thuật ngữ là chỗ chốt mỗi khái niệm chỉ dùng MỘT tên trong SRS, sơ đồ, wireframe và mã nguồn. Thiếu bảng thì tên bảng, tên cột ở BT2 dễ lệch với SRS (tiêu chí 3 của rubric).
- **Ảnh hưởng:** Thêm Bảng 1.1 (19 thuật ngữ, có cột tên kỹ thuật) vào Mục 1 phần 2 của BT1 và vào `docs/srs.md` mục 2. Tên kỹ thuật trong bảng (`ticket`, `ticket.due_date`, `issue_category`, `ticket_status_log`...) là tên dùng cho migration và mã nguồn từ buổi 8.

### TD-02 Gộp 8 User Story còn 7
- **Phản hồi của GV:** Có 8 User Story, đề yêu cầu 5–7.
- **Quyết định:** SỬA
- **Lý do:** US3 cũ (kiểm tra tình trạng bảo hành, UC8) và US4 cũ (tạo phiếu, UC3) cùng xảy ra trong một thao tác lập phiếu, vì UC8 là include của UC3. Gộp thành US3 mới không làm mất yêu cầu nào: FR3 và FR4 cùng truy vết về US3.
- **Ảnh hưởng:** BT1 Mục 1 phần 4 và bảng truy vết phần 7; đặc tả UC3 (US3, US4, US5) và UC7 (US7). Đánh lại mã US trong `docs/srs.md` và cột User Story của `docs/api-contract.md` theo bảng: US1→US1, US2→US2, US3+US4→US3, US5→US4, US6→US5, US7→US6, US8→US7. Story mức MUST nay là US1, US3, US5, US7. Sửa dòng "số lượng User Story" trong `docs/ai-disclosure.md`.

### TD-03 Đặt tên file đúng mẫu và đánh số mục liên tục
- **Phản hồi của GV:** Tên file sai mẫu (BT1-BuiQuocTrieu-MSSV, phải là BT1_<MSSV>_<HoTen>.pdf); đánh số mục bị nhảy (không có Mục 3, kiến trúc thành Mục 4).
- **Quyết định:** SỬA
- **Lý do:** Sai tên file là lỗi hình thức bị trừ điểm và hoàn toàn tránh được. Số mục nhảy làm số hình không khớp số mục, người chấm khó đối chiếu.
- **Ảnh hưởng:** File PDF trong repo đổi tên thành `BT1_2374802010521_BuiQuocTrieu.pdf`. Báo cáo đánh số lại liên tục: Mục 1 SRS, Mục 2 Use case, Mục 3 Kiến trúc (Hình 3.1), Mục 4 Mô hình dữ liệu (Hình 4.1), Mục 5 Wireframe (Hình 5.1–5.3). Cột "Áp dụng ở phần nào" trong `docs/ai-disclosure.md` sửa theo số mục mới.

### TD-04 Rút gọn báo cáo, bỏ API contract khỏi BT1
- **Phản hồi của GV:** Bài dài 28 trang, phần API contract 7 trang là làm thừa so với BT1.
- **Quyết định:** SỬA
- **Lý do:** API contract thuộc phần hiện thực của BT2. Giữ trong báo cáo BT1 làm loãng phần thiết kế được chấm.
- **Ảnh hưởng:** Báo cáo BT1 bản sửa còn 16 trang. Hợp đồng API chỉ còn ở `docs/api-contract.md`; code BT2 bám theo file này.

### TD-05 Chuyển tài liệu sang thư mục docs/ và đưa SRS về đúng Markdown
- **Phản hồi của GV:** Repo để tài liệu trong `doc/diagrams` thay vì `docs/`.
- **Quyết định:** SỬA
- **Lý do:** Đề BT2 quy định cấu trúc tối thiểu có `docs/`. Khi chuyển thư mục, em phát hiện thêm `doc/srs.md` thực chất là file Word đổi đuôi, GitHub không hiển thị được.
- **Ảnh hưởng:** Tài liệu nằm trong `docs/`: tệp gốc `.drawio` (use case, kiến trúc, ERD) ở `docs/`, ảnh PNG xuất ra ở `docs/diagrams/`. `docs/srs.md` được viết lại thành Markdown thật từ Mục 1 và Mục 2 của BT1 bản sửa; xóa bản trùng `docs/diagrams/srs.md`; README mục 4 cập nhật cây thư mục cho khớp. Đổi `env.example` thành `.env.example`.

### TD-06 Commit theo Conventional Commits, mỗi commit một việc
- **Phản hồi của GV:** Commit toàn "Add files via upload". Gợi ý cho BT2: dùng commit dạng `docs(srs): ...`, `feat(ticket): ...` cho từng thay đổi.
- **Quyết định:** SỬA
- **Lý do:** Lịch sử commit là minh chứng CLO5; commit kiểu "update" bị trừ ở tiêu chí 4.
- **Ảnh hưởng:** Từ buổi 8 mọi commit theo dạng `loại(phạm vi): mô tả`, mỗi commit một việc. Hai commit "Cập nhật toàn bộ file" ngày 23/10/2026 được tách thành 8 commit (`chore`, `docs(srs)`, `docs(design)`, `docs(api)`, `docs(bt1)`, `chore(backend)`...), commit đầu "Initial project structure" đổi thành `chore: khởi tạo cấu trúc dự án`. Lịch sử chỉ viết lại một lần (force push ngày 23/10/2026), nội dung tệp không đổi (kiểm bằng `git diff` rỗng); từ nay không viết lại lịch sử nữa.

### TD-07 Giữ mã kiểm tra môi trường trong src/backend
- **Phản hồi của GV:** Đã có mã trong `src/backend` dù BT1 không yêu cầu.
- **Quyết định:** GIỮ NGUYÊN
- **Lý do:** Mã đó chỉ là tệp thử môi trường của buổi 2 (`/` trả "Hello Smart CRM", `/db-check` kiểm tra kết nối PostgreSQL), không chứa nghiệp vụ. Từ buổi 8 nó là điểm khởi động để tổ chức lại theo lớp.
- **Ảnh hưởng:** `src/backend/` được tổ chức lại thành `routes/`, `services/`, `repositories/`, `validators/`, `db/` theo Hình 3.1; `/db-check` giữ lại làm điểm kiểm tra sức khỏe.

### TD-08 Viết kiểm thử UC3 và UC7 trước khi code Service
- **Phản hồi của GV:** Gợi ý cho BT2: viết test cho UC3 luồng 6a và 8a (chỉ mục duy nhất từng phần) và UC7 luồng 3a, 4b trước khi code Service.
- **Quyết định:** SỬA (làm ở BT2)
- **Lý do:** Bốn luồng này là chỗ dễ sai nhất: 6a và 8a dựa vào chỉ mục `ux_ticket_device_open` (QN-01), 3a và 4b là chuyển trạng thái sai và đồng thời. Có test trước thì Service viết ra phải thỏa đúng hành vi đã đặc tả.
- **Ảnh hưởng:** `tests/`. Commit `test(ticket): ...` phải đứng trước `feat(ticket): ...` trong lịch sử. Buổi 8 chưa làm phiếu bảo hành, việc này làm ở buổi 9–10.


## Thay đổi khi hiện thực module đầu tiên (buổi 8)

Các sai lệch so với thiết kế BT1 phát sinh khi viết mã, mỗi thay đổi ba dòng theo đề BT2.

### TD-09 Dùng thư viện `pg` và migration SQL thay cho Prisma
- **Thay đổi:** README BT1 dự kiến Node.js + Prisma ORM. Buổi 8 dùng `pg` gọi SQL trực tiếp; 6 tệp `migrations/001…006_*.sql` chạy bằng `npm run db:migrate`, bảng `schema_migrations` ghi tệp đã chạy, mỗi lệnh có `IF NOT EXISTS`.
- **Vì sao:** DDL BT1 Mục 4.2 đã viết bằng SQL PostgreSQL, có chỉ mục duy nhất từng phần `ux_ticket_device_open … WHERE …` cho QN-01 mà Prisma không biểu diễn trực tiếp. Giữ SQL thì migration giống hệt DDL đã nộp.
- **Ảnh hưởng:** `migrations/`, `src/backend/db/migrate.js`, `src/backend/repositories/` (nơi duy nhất có SQL), README mục 4 và 5.

### TD-10 Dữ liệu mẫu: khách hàng trích từ bộ dữ liệu, nhân viên tự tạo
- **Thay đổi:** Thêm thư mục `seeds/` gồm 3 tệp, mỗi tệp đặt theo tên bảng mà nó nạp vào (`customer`, `issue_category`, `employee` trong ERD BT1). Nguồn từng tệp:

  | Tệp seed | Lấy từ bộ dữ liệu (`dataset/`) | Phần tự thêm |
  |---|---|---|
  | `customer.csv` | 150 dòng đầu của `customers_raw.csv`, giữ nguyên họ tên, số điện thoại thô, email, địa chỉ | Bỏ cột `record_id`, `ngay_tao` (bảng `customer` tự sinh mã và thời điểm tạo) |
  | `issue_category.csv` | 6 nhóm sự cố và mức ưu tiên mặc định của `issue_categories.csv` | Cột `keywords` (từ khóa không dấu cho FR5) |
  | `employee.csv` | Mã trung tâm 1–6 của `service_centers.csv` | Toàn bộ 12 nhân viên: mỗi trung tâm 1 quản lý, 1 nhân viên tiếp nhận, tên giả lập |

  Số điện thoại được chuẩn hóa lúc nạp bằng chính hàm QT-02 của service; dòng không chuẩn hóa được hoặc trùng số thì bỏ qua (150 dòng nạp được 139 khách).
- **Vì sao:** Đổi tên tệp vì nội dung đã khác tệp gốc (ít dòng hơn, bớt hoặc thêm cột), giữ tên `customers_raw.csv` dễ bị hiểu là chép nguyên tệp 6 MB. Bộ dữ liệu không có cột từ khóa và không có nhân viên quầy tiếp nhận (chỉ có `technicians.csv`, thuộc L4). Lấy ít dòng khách để repo nhẹ nhưng vẫn đủ các dạng số "0760.833.592", "+84…", số rỗng để thấy QT-02 chạy.
- **Ảnh hưởng:** `seeds/`, `src/backend/db/seed.js`. Tên nhân viên là tên giả lập, không phải nhân viên thật của Mekong Mobile.

### TD-11 Thư mục `test/` đổi thành `tests/`; `migrations/` và `seeds/` đặt ở gốc repo
- **Thay đổi:** Đổi tên `test/` thành `tests/`; thêm `migrations/` và `seeds/` ở gốc; mã backend vẫn nằm trong `src/backend/`, tách thành `routes/`, `validators/`, `services/`, `repositories/`, `db/`, `errors/`.
- **Vì sao:** Đề BT2 quy định cấu trúc tối thiểu có `tests/`, `migrations/`, `seeds/`; giữ `src/backend` để khớp sơ đồ kiến trúc và README BT1 (TD-07).
- **Ảnh hưởng:** README mục 4, `src/backend/package.json` (đường dẫn trong các lệnh `db:migrate`, `db:seed`, `test`).

## Thay đổi khi làm phiếu bảo hành, đăng nhập và giao diện (buổi 9–10)

### TD-12 Dữ liệu mẫu cho thiết bị, phiếu, nhật ký và quy ước giờ Việt Nam
- **Thay đổi:** Thêm 3 tệp seed theo tên bảng: `device.csv` (25 dòng), `ticket.csv` (25 dòng), `ticket_status_log.csv` (119 dòng). Bộ dữ liệu gốc không có ngày mua nên cột `purchase_date` do em tự sinh (có ngày mua đủ để QT-05 kiểm tra bảo hành được), không phải số liệu thật của Mekong Mobile. Cột `changed_by` của bộ dữ liệu là kỹ thuật viên (thuộc L4) nên khi nạp được đổi thành nhân viên tiếp nhận (dòng đầu tiên) hoặc Quản lý trung tâm (các dòng sau, theo A4). Thời điểm trong các cột TIMESTAMP được lưu theo giờ Việt Nam; `db/pool.js` gắn múi +07:00 khi đọc ra và đặt múi giờ phiên làm việc là Asia/Ho_Chi_Minh, nên API luôn trả ISO 8601 có +07:00.
- **Vì sao:** Cần phiếu có sẵn ở mọi trạng thái và có phiếu quá hạn để chạy thử danh sách và đổi trạng thái; cột kiểu `TIMESTAMP` không lưu múi giờ nên phải chọn một quy ước duy nhất để QT-04 (24/72/120 giờ, bỏ Chủ nhật) và `is_overdue` không lệch 7 giờ.
- **Ảnh hưởng:** `seeds/`, `src/backend/db/seed.js`, `src/backend/db/pool.js`, `ticket.repository.js`. Chạy lại `db:seed` không nhân đôi dữ liệu (đã thử). Ngày mua và người đổi trạng thái trong dữ liệu mẫu là dữ liệu giả lập.

### TD-13 Đăng nhập tối thiểu bằng JWT
- **Thay đổi:** SRS xếp đăng nhập vào mục không làm (WON'T) nhưng buổi 9–10 yêu cầu nhận 401 và phân quyền nên em làm bản tối thiểu: `POST /api/auth/login`, `GET /api/auth/me`, migration `007_add_employee_login.sql` (thêm `username`, `password_hash`, chỉ mục duy nhất `ux_employee_username`). Mật khẩu băm bằng bcryptjs (cost 10); token JWT HS256 sống 8 giờ, chứa `user_id`, `role`, `center_id`, khóa bí mật lấy từ `SECRET_KEY` trong `.env`. Khi sai tên đăng nhập vẫn so sánh với một giá trị băm giả và dùng cùng một thông báo để không lộ tên nào tồn tại. Giao diện lưu token trong `localStorage`.
- **Vì sao:** Cần danh tính để áp QT-14 (chỉ thấy phiếu trung tâm mình), QT-15 (che số điện thoại) và vai trò chuyển trạng thái, mà không làm module quản lý tài khoản đầy đủ.
- **Ảnh hưởng:** `middleware/authenticate.js`, `require-role.js`, `services/auth.service.js`, `routes/auth.routes.js`, `docs/api-contract.md`, `src/frontend/src/auth/`. Hạn chế đã biết: token trong `localStorage` bị mã JavaScript chèn vào trang (XSS) đọc được; cách an toàn hơn là cookie HttpOnly do máy chủ đặt, chưa làm. Không có đổi mật khẩu, khóa tài khoản hay đăng ký.

### TD-14 Chi tiết phiếu trả thêm `allowed_transitions`
- **Thay đổi:** `GET /api/tickets/{id}` trả thêm mảng `allowed_transitions`: các trạng thái đích mà người đang đăng nhập được chuyển tới, tính bằng `rules.allowedTargets(status, role)`. Có test viết trước (`ticket.read.test.js`).
- **Vì sao:** Để màn hình chi tiết biết vẽ nút nào mà không sao chép luật vòng đời (QT-06) và phân quyền sang frontend; một nguồn sự thật duy nhất, tránh lệch khi luật đổi.
- **Ảnh hưởng:** `services/ticket.service.js`, `tests/ticket.read.test.js`, `docs/api-contract.md`, `TicketDetailPage.jsx`. Hợp đồng dữ liệu 18 trường của phiếu không đổi; trường mới nằm ngoài 18 trường đó.

### TD-15 Chưa làm ghi nhận thiết bị mới và màn hình tạo khách hàng
- **Thay đổi:** Không làm `POST /api/customers/{id}/devices` (UC2, ghi nhận thiết bị) và màn hình tạo hồ sơ khách mới. `POST /api/customers` vẫn có ở API. Khi tra cứu số chưa có hồ sơ, giao diện hiện thông báo và mời kiểm tra lại số.
- **Vì sao:** Luồng chính đủ ý nghĩa chạy được với thiết bị lấy từ dữ liệu mẫu (TD-12); ưu tiên làm đúng và có test cho UC3, UC7, đăng nhập và 4 màn hình trong thời gian buổi 9–10.
- **Ảnh hưởng:** `docs/api-contract.md` có ghi chú tiến độ; README mục 3 và 6; UC2 mới chạy qua API. Cần làm nốt trước khi dùng thật.

### TD-16 Các hạn chế triển khai khác
- **Thay đổi:** (a) CORS chỉ cho một nguồn (`CORS_ORIGIN`, mặc định `http://localhost:5173`) và middleware tự viết, không dùng thư viện `cors`. (b) 12 tài khoản mẫu dùng chung mật khẩu `Mekong@2026` (đổi bằng `SEED_PASSWORD`). (c) `POST /api/tickets` thiếu `customer_id` trả 400 `VALIDATION_FAILED` chứ không phải 404.
- **Vì sao:** (a) Giao diện và backend chỉ chạy cục bộ ở hai cổng cố định, ít thư viện hơn; (b) chỉ để thử nghiệm; (c) thiếu trường là lỗi dữ liệu vào, khác với "không tồn tại" (đã ghi trong hợp đồng API).
- **Ảnh hưởng:** `middleware/cors.js`, `db/seed.js`, `validators/ticket.validator.js`, README mục 5 (phần hạn chế đã biết). Khi triển khai thật phải đổi cả ba.

## Thay đổi khi tích hợp, đóng gói và xử lý lỗi (buổi 11–12, Bài tập 2)

### TD-17 Làm CRUD thiết bị, đóng TD-15
- **Thay đổi:** Thêm `POST /api/customers/{id}/devices`, `GET`, `PATCH`, `DELETE /api/devices/{id}` theo ba lớp (`device.validator.js`, `device.service.js`, `device.repository.js`, `device.routes.js`), test viết trước (`tests/device.test.js`). Serial trùng trả 409 `SERIAL_EXISTS` (QT-03); thiết bị đã có phiếu không xóa được (409 `DEVICE_HAS_TICKETS`); thiết bị nhập nhầm chưa có phiếu thì xóa hẳn vì bảng `device` của DDL BT1 không có cột `is_active`.
- **Vì sao:** Tiêu chí S1 của BT2 cần ít nhất hai thực thể đủ CRUD; khách hàng đã đủ từ buổi 8, phiếu bảo hành không được xóa (chỉ chuyển sang Đã hủy, QT-06). Thiết bị là thực thể còn thiếu của UC2 (TD-15).
- **Ảnh hưởng:** `src/backend/`, `docs/api-contract.md` (mục 1, 3), `README.md`. Màn hình tạo khách và thiết bị mới vẫn chưa có, dùng qua API.

### TD-18 Logging JSON, middleware lỗi duy nhất và 503 khi CSDL không dùng được
- **Thay đổi:** `src/backend/logger.js` ghi mỗi dòng log là JSON ra stdout (thời điểm ISO, mức, thông điệp, `requestId`), mức lấy từ `LOG_LEVEL`, che mật khẩu, token, khóa bí mật và số điện thoại (QT-15); không ghi query string. Middleware lỗi là nơi duy nhất ghi log lỗi: lỗi nghiệp vụ ghi INFO, lỗi hệ thống ghi một dòng ERROR. CSDL tắt hoặc hết thời gian chờ thì trả 503 `DB_UNAVAILABLE` thay vì 500; 500 và 503 kèm `request_id`, giao diện hiện mã này là "Mã tra cứu". Thêm `GET /health`.
- **Vì sao:** Yêu cầu buổi 11 (log có ích và an toàn, dịch lỗi ở ranh giới, ghi log một lần) và phép thử "suy giảm có kiểm soát" của BT2. Phép thử này làm lộ BUG-002 (backend tắt hẳn khi PostgreSQL tắt) và BUG-003 (ngày mua lùi một ngày), ghi ở `docs/bug-log.md`.
- **Ảnh hưởng:** `logger.js`, `routes/error-handler.js`, `db/pool.js`, `db/db-errors.js`, `index.js`, `DataState.jsx`, `docs/api-contract.md` mục 2. `console.log` chỉ còn ở hai script dòng lệnh `db:migrate`, `db:seed` để in tiến độ.

### TD-19 Đóng gói bằng Docker Compose
- **Thay đổi:** Thêm `docker-compose.yml` ba dịch vụ `db` (postgres:16-alpine), `api`, `web` và hai Dockerfile hai giai đoạn (`src/backend/Dockerfile`, `src/frontend/Dockerfile` với nginx). `api` chờ `db` healthy, `web` chờ `api` healthy (HEALTHCHECK gọi `/health`); `api` tự chạy migrate và seed khi khởi động (chạy lại không nhân đôi); `db:migrate` có thêm vòng chờ CSDL tối đa 15 lần. Ảnh nền ghim phiên bản, container chạy bằng người dùng không đặc quyền, cổng CSDL không mở ra máy thật. `.env.example` có giá trị mẫu (không phải giá trị thật) để `cp .env.example .env` rồi `docker compose up -d --build` là chạy được.
- **Vì sao:** Phép thử thư mục trống của buổi 12 (C1) và gói chạy bằng ≤ 2 lệnh của BT3; loại bỏ khác biệt phiên bản Node, PostgreSQL giữa máy em và máy giảng viên.
- **Ảnh hưởng:** Hai cách chạy trong README: Docker (khuyên dùng) và cách cũ với Node + PostgreSQL cài trên máy (giữ nguyên). Docker chỉ là cách đóng gói, không đổi kiến trúc ba lớp.