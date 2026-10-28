# Smart CRM – Tiếp nhận và phân loại yêu cầu bảo hành (Mekong Mobile · Luồng L2)

**Sinh viên:** Bùi Quốc Triệu – **MSSV:** 2374802010521
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán

**Luồng nghiệp vụ L2 – Tiếp nhận và phân loại yêu cầu bảo hành:** Nhân viên tiếp nhận tra cứu khách hàng, ghi nhận thiết bị và mô tả lỗi để lập phiếu bảo hành; hệ thống phân loại nhóm sự cố, đề xuất mức ưu tiên và sinh hạn cam kết; Quản lý trung tâm theo dõi phiếu và cập nhật trạng thái theo vòng đời.

- **Bắt đầu:** Nhân viên tiếp nhận nhập số điện thoại của khách để tra cứu hồ sơ khách hàng và thiết bị.
- **Xử lý:** Kiểm tra tình trạng bảo hành theo ngày mua; lập phiếu bảo hành kèm mô tả lỗi (mỗi thiết bị chỉ có tối đa 1 phiếu chưa đóng); hệ thống đề xuất nhóm sự cố, mức ưu tiên và tự sinh hạn cam kết (24/72/120 giờ, chỉ tính Thứ Hai đến Thứ Bảy); mỗi lần chuyển trạng thái đều được ghi vào nhật ký và không được quay lại trạng thái trước.
- **Kết thúc:** Phiếu bảo hành được lưu với trạng thái Mới, có mã duy nhất (BH-nnnnnn/năm) và hạn cam kết; các lần chuyển trạng thái sau đó được ghi nhật ký cho đến khi phiếu ở trạng thái Đã đóng.

## 2. Yêu cầu môi trường

| Thành phần | Phiên bản |
|---|---|
| Node.js | 20.19 trở lên (đã chạy thử với Node 24, npm 11) |
| PostgreSQL | 14 trở lên (đã chạy thử với PostgreSQL 18 trên Windows) |
| Thư viện backend | express 5, pg 8, dotenv 18, csv-parse 7, bcryptjs 3, jsonwebtoken 9 (khóa phiên bản trong `src/backend/package-lock.json`) |
| Thư viện frontend | react 19, react-dom 19, react-router-dom 7, vite 8, @vitejs/plugin-react 6 (khóa trong `src/frontend/package-lock.json`) |
| Biến môi trường backend | xem `.env.example` ở gốc repo: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `APP_PORT`, `SECRET_KEY`, tùy chọn `CORS_ORIGIN`, `SEED_PASSWORD`. Tệp `.env` thật không commit |
| Biến môi trường frontend | xem `src/frontend/.env.example`: `VITE_API_BASE_URL` (địa chỉ backend). Tệp `.env` thật không commit |
| Hệ điều hành | Windows (Git Bash hoặc PowerShell), macOS hoặc Linux |

## 3. Phạm vi

**Làm:**

- Tra cứu khách hàng theo số điện thoại và xem thiết bị của khách (UC1)
- Ghi nhận khách hàng mới qua API khi chưa có hồ sơ (UC2, chưa có màn hình, xem TD-15)
- Kiểm tra và hiển thị tình trạng bảo hành của thiết bị (UC8)
- Tạo phiếu bảo hành kèm mô tả lỗi, phụ kiện, kiểm tra ràng buộc thiết bị không có phiếu chưa đóng (UC3)
- Đề xuất nhóm sự cố và mức ưu tiên từ mô tả lỗi (UC4)
- Tự sinh hạn cam kết theo mức ưu tiên (UC5)
- Xem danh sách phiếu bảo hành sắp theo hạn cam kết, đánh dấu phiếu quá hạn (UC6, UC9)
- Chuyển trạng thái phiếu theo vòng đời và ghi nhật ký (UC7)
- Đăng nhập tối thiểu (JWT) và phân quyền theo vai trò, theo trung tâm (QT-14); giao diện React gồm 4 màn hình: đăng nhập, danh sách phiếu, chi tiết phiếu, tiếp nhận thiết bị

**Không làm:**

- Không phân công kỹ thuật viên và đặt lịch hẹn giao – nhận máy – thuộc luồng L4; ở L2 Quản lý trung tâm cập nhật trạng thái sửa chữa thay cho kỹ thuật viên.
- Không quản lý kho linh kiện và việc xuất linh kiện cho phiếu – thuộc luồng L5.
- Không thu thập khảo sát hài lòng sau khi đóng phiếu – thuộc luồng L8.
- Không phân loại bằng học máy – thuộc luồng L10; L2 chỉ đề xuất nhóm sự cố bằng luật từ khóa.
- Không mở lại phiếu đã đóng, không gửi SMS/Zalo cho khách và không gộp hồ sơ khách trùng (thuộc luồng L1).
- Không phê duyệt phiếu "bảo hành chưa xác minh" ở mức đầy đủ – ở L2 phiếu chỉ được đánh dấu và hiển thị.
- Không quản lý danh mục trung tâm bảo hành và quản lý tài khoản (đổi mật khẩu, khóa tài khoản, đăng ký) – dùng 12 tài khoản mẫu có sẵn.
- Chưa có màn hình tạo hồ sơ khách mới và endpoint ghi nhận thiết bị mới (xem TD-15).

## 4. Công nghệ và cấu trúc thư mục

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js + Express, thư viện `pg` gọi SQL trực tiếp (không dùng Prisma, xem TD-09 trong `docs/thay-doi-thiet-ke.md`) |
| Database | PostgreSQL, migration SQL đánh số trong `migrations/` |
| Xác thực | bcryptjs (băm mật khẩu), jsonwebtoken (HS256, hết hạn sau 8 giờ) |
| Kiểm thử | `node:test` có sẵn của Node.js |
| Frontend | ReactJS 19 + Vite 8, React Router 7, gọi API qua `fetch` gom trong `src/api` |

```
smartcrm-2374802010521-Receive-and-classify-warranty-requests/
├── docs/                     # SRS, sơ đồ, hợp đồng API, nhật ký thay đổi thiết kế, khai báo AI, ảnh chạy
│   ├── usecase.drawio, architecture.drawio, erd.drawio
│   ├── diagrams/             # ảnh PNG xuất từ sơ đồ và wireframe
│   ├── srs.md, api-contract.md, thay-doi-thiet-ke.md, ai-disclosure.md
│   └── screenshots/          # ảnh chạy backend và giao diện
├── migrations/               # 001–007: 6 bảng theo DDL BT1 và cột đăng nhập của nhân viên
├── seeds/                    # dữ liệu mẫu CSV đặt theo tên bảng (nguồn: xem TD-10, TD-12)
├── src/
│   ├── backend/
│   │   ├── routes/           # Lớp API: nhận/trả JSON, đổi mã lỗi sang mã HTTP
│   │   ├── middleware/       # Xác thực token, kiểm tra vai trò, CORS
│   │   ├── validators/       # Kiểm tra định dạng dữ liệu vào
│   │   ├── services/         # Lớp nghiệp vụ (QT-01 đến QT-15); không biết HTTP
│   │   ├── repositories/     # Lớp truy cập dữ liệu: chỉ chứa SQL tham số hóa
│   │   ├── db/               # Kết nối, chạy migration, nạp seed
│   │   ├── errors/           # Lỗi nghiệp vụ dùng chung
│   │   └── index.js          # Khởi động Express, gắn route
│   └── frontend/
│       ├── src/api/          # Mọi lời gọi fetch nằm ở đây (client.js, auth, tickets, customers)
│       ├── src/hooks/        # useApi, useTickets: lấy dữ liệu, trả data / loading / error
│       ├── src/components/   # DataState (tải, lỗi, rỗng), Badge, Field, Pagination, Layout
│       ├── src/pages/        # LoginPage, TicketListPage, TicketDetailPage, ReceiveDevicePage
│       └── src/auth/         # Lưu và xóa phiên đăng nhập (token)
├── tests/                    # kiểm thử tự động
├── .env.example
├── BT1_2374802010521_BuiQuocTrieu.pdf
├── .gitignore
└── README.md
```

## 5. Cài đặt và chạy

**Chạy backend trước, rồi mới chạy frontend** (giao diện gọi API ở cổng 3000).

```bash
# 1. Clone và vào thư mục dự án
git clone https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests.git
cd smartcrm-2374802010521-Receive-and-classify-warranty-requests

# 2. Tạo tệp cấu hình rồi điền DB_USER, DB_PASSWORD của PostgreSQL và một SECRET_KEY bất kỳ (chuỗi dài, ngẫu nhiên)
cp .env.example .env            # PowerShell: Copy-Item .env.example .env

# 3. Tạo CSDL trống
psql -U postgres -c "CREATE DATABASE smartcrm;"

# 4. Cài thư viện backend đúng phiên bản đã khóa
cd src/backend
npm ci

# 5. Dựng bảng từ CSDL trống, rồi nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi, không nhân đôi)
npm run db:migrate
npm run db:seed

# 6. Chạy backend tại http://localhost:3000 (giữ cửa sổ này mở)
npm start

# 7. Mở cửa sổ terminal MỚI, cài và chạy frontend tại http://localhost:5173
cd src/frontend                 # từ thư mục gốc dự án
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
npm ci
npm run dev
```

Mở trình duyệt tại `http://localhost:5173` và đăng nhập bằng một trong các tài khoản mẫu (mật khẩu chung `Mekong@2026`, đổi được bằng biến `SEED_PASSWORD` trước khi chạy `db:seed`):

| Vai trò | Tài khoản | Làm được gì |
|---|---|---|
| Nhân viên tiếp nhận | `nv_tt01` … `nv_tt06` (số là mã trung tâm) | Tiếp nhận thiết bị, xem phiếu của trung tâm mình, chỉ chuyển phiếu sang Đã đóng hoặc Đã hủy |
| Quản lý trung tâm | `ql_tt01` … `ql_tt06` | Xem phiếu, chuyển trạng thái theo vòng đời, thấy đầy đủ số điện thoại |

Mỗi tài khoản chỉ thấy phiếu của trung tâm mình (QT-14). Trung tâm 4 (`nv_tt04`, `ql_tt04`) có sẵn phiếu quá hạn để xem đánh dấu.

**Chạy kiểm thử** (47 test; test truy vấn CSDL tự bỏ qua nếu chưa có CSDL đã migrate và seed):

```bash
cd src/backend
npm test
```

**Build bản sản xuất của frontend:** `cd src/frontend` rồi `npm run build` (kết quả trong `dist/`, không commit).

Kiểm tra backend đã chạy đúng (mở terminal khác; trên PowerShell gõ `curl.exe` thay cho `curl`, lệnh POST nên chạy bằng Git Bash hoặc dùng `Invoke-RestMethod`):

```bash
curl http://localhost:3000/db-check                                   # {"status":"OK",...}
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"nv_tt04","password":"Mekong@2026"}'   # 200, có access_token
curl http://localhost:3000/api/tickets                                # 401 vì chưa gửi token
```

**Hạn chế đã biết:**

- Token đăng nhập lưu trong `localStorage` của trình duyệt nên mã JavaScript độc hại chèn vào trang (XSS) đọc được; cách an toàn hơn là cookie HttpOnly do máy chủ đặt (ghi ở TD-13).
- Backend chỉ cho phép CORS từ một nguồn (`CORS_ORIGIN`, mặc định `http://localhost:5173`), nên frontend phải chạy ở cổng 5173.
- Mọi tài khoản mẫu dùng chung một mật khẩu thử nghiệm; không dùng cho môi trường thật.

## 6. Trạng thái hiện tại (buổi 10)

- [x] Xử lý phản hồi BT1, ghi `docs/thay-doi-thiet-ke.md` (TD-01 → TD-16)
- [x] Backend theo 3 lớp: khách hàng, phiếu bảo hành (tiếp nhận, danh sách, chi tiết, đổi trạng thái), đề xuất nhóm sự cố, đăng nhập và phân quyền
- [x] Test viết trước code cho UC3 6a, 8a và UC7 3a, 4b; 47 kiểm thử `npm test` PASS
- [x] Dữ liệu mẫu: 6 nhóm sự cố, 12 nhân viên, 139 khách, 25 thiết bị, 25 phiếu, 119 dòng nhật ký (TD-10, TD-12)
- [x] Hợp đồng API cập nhật theo code (`docs/api-contract.md`)
- [x] Frontend React + Vite: đăng nhập, danh sách phiếu (lọc, phân trang), chi tiết phiếu (đổi trạng thái), tiếp nhận thiết bị; đủ trạng thái đang tải, lỗi có nút thử lại, rỗng; khung 375px không tràn ngang
- [ ] Màn hình tạo khách hàng mới và endpoint ghi nhận thiết bị mới (TD-15)
- [ ] Trang tổng quan Quản lý, báo cáo, quản lý tài khoản – ngoài phạm vi L2

Ảnh chạy thật nằm trong `docs/screenshots/` (07 đến 15 là giao diện).

## 7. Khai báo sử dụng công cụ AI

Bản đầy đủ: [`docs/ai-disclosure.md`](docs/ai-disclosure.md).

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude | Hỗ trợ soạn thảo tài liệu đặc tả (mô tả luồng, user story, use case) từ ý tưởng ban đầu | Đối chiếu lại từng use case với case study gốc và dữ liệu mẫu để đảm bảo đúng phạm vi, không bịa quy tắc nghiệp vụ |
| Claude | Gợi ý cấu trúc bảng dữ liệu (ticket, customer, device, issue_category, ticket_status_log, employee) và ràng buộc khóa chính/khóa ngoại | Đối chiếu với từ điển dữ liệu của case study; chạy thử phần SQL DDL (Mục 4.2 báo cáo BT1) trên PostgreSQL cục bộ |
| Claude | Hỗ trợ viết tiêu chí chấp nhận và khung ca kiểm thử cho QT-04, QT-05, QT-06 (hạn cam kết, bảo hành, vòng đời trạng thái) | Tính lại thủ công các ví dụ về hạn cam kết, đối chiếu Bảng 9.1 và đọc lại từng tiêu chí trước khi commit |
| Claude | Hỗ trợ vẽ sơ đồ (use case, kiến trúc, ERD), wireframe và hợp đồng API | Mở lại các file `.drawio` để chỉnh; kiểm tra thuật ngữ nhất quán giữa SRS và sơ đồ bằng Ctrl+F |
| Claude | Hỗ trợ viết mã backend buổi 8 (migration, seed, các lớp routes/services/repositories, unit test) | Tự gõ và chạy từng bước trên máy: `db:migrate`, `db:seed` chạy 2 lần, gọi API bằng curl; đối chiếu migration với DDL BT1 và mã lỗi với `docs/api-contract.md` |
| Claude | Hỗ trợ viết mã buổi 9–10: backend phiếu bảo hành, đăng nhập JWT, test viết trước (UC3, UC7) và giao diện React/Vite 4 màn hình | Tự gõ, chạy `npm test` (47 pass), gọi API bằng PowerShell, chạy giao diện với backend và dữ liệu thật, chụp ảnh các trạng thái tải, lỗi, rỗng, khung 375px; thử lại trên bản clone mới |