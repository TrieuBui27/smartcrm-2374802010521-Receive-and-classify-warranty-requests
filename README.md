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
| Node.js | 20 LTS trở lên (đã chạy thử với Node 24, npm 11) |
| PostgreSQL | 14 trở lên (đã chạy thử với PostgreSQL 18 trên Windows) |
| Thư viện backend | express 5, pg 8, dotenv 18, csv-parse 7 (khóa phiên bản trong `src/backend/package-lock.json`) |
| Biến môi trường | xem `.env.example`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `APP_PORT`, `SECRET_KEY`. Tệp `.env` thật không commit |
| Hệ điều hành | Windows (Git Bash hoặc PowerShell), macOS hoặc Linux |

## 3. Phạm vi

**Làm:**

- Tra cứu khách hàng theo số điện thoại và xem thiết bị của khách (UC1)
- Ghi nhận khách hàng và thiết bị mới khi chưa có hồ sơ (UC2)
- Kiểm tra và hiển thị tình trạng bảo hành của thiết bị (UC8)
- Tạo phiếu bảo hành kèm mô tả lỗi, phụ kiện, kiểm tra ràng buộc thiết bị không có phiếu chưa đóng (UC3)
- Đề xuất nhóm sự cố và mức ưu tiên từ mô tả lỗi (UC4)
- Tự sinh hạn cam kết theo mức ưu tiên (UC5)
- Xem danh sách phiếu bảo hành sắp theo hạn cam kết, đánh dấu phiếu quá hạn (UC6, UC9)
- Chuyển trạng thái phiếu theo vòng đời và ghi nhật ký (UC7)

**Không làm:**

- Không phân công kỹ thuật viên và đặt lịch hẹn giao – nhận máy – thuộc luồng L4; ở L2 Quản lý trung tâm cập nhật trạng thái sửa chữa thay cho kỹ thuật viên.
- Không quản lý kho linh kiện và việc xuất linh kiện cho phiếu – thuộc luồng L5.
- Không thu thập khảo sát hài lòng sau khi đóng phiếu – thuộc luồng L8.
- Không phân loại bằng học máy – thuộc luồng L10; L2 chỉ đề xuất nhóm sự cố bằng luật từ khóa.
- Không mở lại phiếu đã đóng, không gửi SMS/Zalo cho khách và không gộp hồ sơ khách trùng (thuộc luồng L1).
- Không phê duyệt phiếu "bảo hành chưa xác minh" ở mức đầy đủ – ở L2 phiếu chỉ được đánh dấu và hiển thị.
- Không quản lý danh mục trung tâm bảo hành và đăng nhập chi tiết – dùng dữ liệu mẫu có sẵn, vai trò người dùng lấy từ bảng `employee`.

## 4. Công nghệ và cấu trúc thư mục

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js + Express, thư viện `pg` gọi SQL trực tiếp (không dùng Prisma, xem TD-09 trong `docs/thay-doi-thiet-ke.md`) |
| Database | PostgreSQL, migration SQL đánh số trong `migrations/` |
| Kiểm thử | `node:test` có sẵn của Node.js |
| Frontend (từ buổi 10) | ReactJS + Vite |

```
smartcrm-2374802010521-Receive-and-classify-warranty-requests/
├── docs/                     # SRS, sơ đồ, hợp đồng API, nhật ký thay đổi thiết kế, khai báo AI, ảnh chạy
│   ├── usecase.drawio, architecture.drawio, erd.drawio
│   ├── diagrams/             # ảnh PNG xuất từ sơ đồ và wireframe
│   ├── srs.md, api-contract.md, thay-doi-thiet-ke.md, ai-disclosure.md
│   └── screenshots/
├── migrations/               # 001–006 tạo 6 bảng theo DDL BT1
├── seeds/                    # dữ liệu mẫu CSV đặt theo tên bảng (nguồn: xem TD-10)
├── src/
│   ├── backend/
│   │   ├── routes/           # Lớp API: nhận/trả JSON, đổi mã lỗi sang mã HTTP
│   │   ├── validators/       # Kiểm tra định dạng dữ liệu vào
│   │   ├── services/         # Lớp nghiệp vụ: QT-01, QT-02, QT-13, QT-15; không biết HTTP
│   │   ├── repositories/     # Lớp truy cập dữ liệu: chỉ chứa SQL tham số hóa
│   │   ├── db/               # Kết nối, chạy migration, nạp seed
│   │   ├── errors/           # Lỗi nghiệp vụ dùng chung
│   │   └── index.js          # Khởi động Express, gắn route
│   └── frontend/             # từ buổi 10
├── tests/                    # kiểm thử tự động
├── .env.example
├── BT1_2374802010521_BuiQuocTrieu.pdf
├── .gitignore
└── README.md
```

## 5. Cài đặt và chạy

```bash
# 1. Clone và vào thư mục dự án
git clone https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests.git
cd smartcrm-2374802010521-Receive-and-classify-warranty-requests

# 2. Tạo tệp cấu hình rồi điền DB_USER, DB_PASSWORD của PostgreSQL trên máy
cp .env.example .env            # PowerShell: Copy-Item .env.example .env

# 3. Tạo CSDL trống
psql -U postgres -c "CREATE DATABASE smartcrm;"

# 4. Cài thư viện đúng phiên bản đã khóa
cd src/backend
npm ci

# 5. Dựng bảng từ CSDL trống, rồi nạp dữ liệu mẫu (chạy lại nhiều lần không lỗi, không nhân đôi)
npm run db:migrate
npm run db:seed

# 6. Chạy backend tại http://localhost:3000
npm start

# 7. Chạy kiểm thử (không cần CSDL)
npm test
```

Kiểm tra đã chạy đúng (mở terminal khác; trên PowerShell gõ `curl.exe` thay cho `curl`, lệnh POST nên chạy bằng Git Bash):

```bash
curl http://localhost:3000/db-check                                   # {"status":"OK",...}
curl "http://localhost:3000/api/customers?phone=0760.833.592"         # 200, số đã che 076****592
curl "http://localhost:3000/api/customers?phone=12345"                # 400 INVALID_PHONE
curl -X POST http://localhost:3000/api/customers -H "Content-Type: application/json" -d '{"full_name":"Nguyễn Văn An","phone":"0901 234 567"}'   # 201, gửi lại lần 2 thì 409
```

## 6. Trạng thái hiện tại (buổi 8)

- [x] Xử lý phản hồi BT1, ghi `docs/thay-doi-thiet-ke.md` (TD-01 → TD-11)
- [x] Cấu trúc `src/backend` theo sơ đồ kiến trúc (routes / validators / services / repositories / db)
- [x] 6 migration theo DDL BT1; seed 6 nhóm sự cố, 12 nhân viên, 139 khách hàng (11 dòng số sai bị bỏ qua)
- [x] CRUD khách hàng qua 3 lớp: tra cứu theo số điện thoại, tạo, xem, sửa, ngừng sử dụng; quy tắc QT-01, QT-02, QT-13, QT-15
- [x] 8 kiểm thử `npm test` PASS (luồng đúng, giá trị biên, dữ liệu sai)
- [ ] CRUD thiết bị (thực thể thứ hai) – sau buổi 8
- [ ] Phiếu bảo hành UC3, UC7: viết test 6a, 8a, 3a, 4b trước rồi mới code TicketService – buổi 9–10
- [ ] Đăng nhập, phân quyền QT-14, giao diện 3 màn hình – buổi 10–11

## 7. Khai báo sử dụng công cụ AI

Bản đầy đủ: [`docs/ai-disclosure.md`](docs/ai-disclosure.md).

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude | Hỗ trợ soạn thảo tài liệu đặc tả (mô tả luồng, user story, use case) từ ý tưởng ban đầu | Đối chiếu lại từng use case với case study gốc và dữ liệu mẫu để đảm bảo đúng phạm vi, không bịa quy tắc nghiệp vụ |
| Claude | Gợi ý cấu trúc bảng dữ liệu (ticket, customer, device, issue_category, ticket_status_log, employee) và ràng buộc khóa chính/khóa ngoại | Đối chiếu với từ điển dữ liệu của case study; chạy thử phần SQL DDL (Mục 4.2 báo cáo BT1) trên PostgreSQL cục bộ |
| Claude | Hỗ trợ viết tiêu chí chấp nhận và khung ca kiểm thử cho QT-04, QT-05, QT-06 (hạn cam kết, bảo hành, vòng đời trạng thái) | Tính lại thủ công các ví dụ về hạn cam kết, đối chiếu Bảng 9.1 và đọc lại từng tiêu chí trước khi commit |
| Claude | Hỗ trợ vẽ sơ đồ (use case, kiến trúc, ERD), wireframe và hợp đồng API | Mở lại các file `.drawio` để chỉnh; kiểm tra thuật ngữ nhất quán giữa SRS và sơ đồ bằng Ctrl+F |
| Claude | Hỗ trợ viết mã backend buổi 8 (migration, seed, các lớp routes/services/repositories, unit test) | Tự gõ và chạy từng bước trên máy: `db:migrate`, `db:seed` chạy 2 lần, `npm test` 8/8, gọi API bằng curl; đối chiếu migration với DDL BT1 và mã lỗi với `docs/api-contract.md` |
