# Smart CRM – Tiếp nhận và phân loại yêu cầu bảo hành (Mekong Mobile · Luồng L2)

**Sinh viên:** Bùi Quốc Triệu – **MSSV:** 2374802010521
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán

**Luồng nghiệp vụ L2 – Tiếp nhận và phân loại yêu cầu bảo hành:** Nhân viên tiếp nhận tra cứu khách hàng, ghi nhận thiết bị và mô tả lỗi để lập phiếu bảo hành; hệ thống phân loại nhóm sự cố, đề xuất mức ưu tiên và sinh hạn cam kết; Quản lý trung tâm theo dõi phiếu và cập nhật trạng thái theo vòng đời.

- **Bắt đầu:** Nhân viên tiếp nhận nhập số điện thoại của khách để tra cứu hồ sơ khách hàng và thiết bị.
- **Xử lý:** Kiểm tra tình trạng bảo hành theo ngày mua; lập phiếu bảo hành kèm mô tả lỗi (mỗi thiết bị chỉ có tối đa 1 phiếu chưa đóng); hệ thống đề xuất nhóm sự cố, mức ưu tiên và tự sinh hạn cam kết (24/72/120 giờ, chỉ tính Thứ Hai đến Thứ Bảy); mỗi lần chuyển trạng thái đều được ghi vào nhật ký và không được quay lại trạng thái trước.
- **Kết thúc:** Phiếu bảo hành được lưu với trạng thái Mới, có mã duy nhất (BH-nnnnnn/năm) và hạn cam kết; các lần chuyển trạng thái sau đó được ghi nhật ký cho đến khi phiếu ở trạng thái Đã đóng.

## 2. Phạm vi

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

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Design | Figma (UI), dbdiagram.io (ERD) |
| Frontend | ReactJS + Vite + TailwindCSS |
| Backend | Node.js (Express hoặc NestJS) + Prisma ORM |
| Database | PostgreSQL |
| Testing | Vitest + Supertest |
| API Docs | Swagger / OpenAPI |
| Containerization | Docker + docker-compose |
| Quản lý mã nguồn | Git + GitHub (Conventional Commits, nhánh main/dev/feature) |
| Công cụ hỗ trợ | Postman, VS Code, pgAdmin/DBeaver |

## 4. Cấu trúc thư mục

```
smartcrm-2374802010521-Receive-and-classify-warranty-requests/
├── docs/
│   ├── srs.md                # bản SRS rút gọn (nguồn của file PDF)
│   ├── usecase.drawio        # file gốc Use Case Diagram
│   ├── architecture.drawio   # file gốc sơ đồ kiến trúc
│   ├── erd.drawio            # file gốc ERD (6 bảng)
│   ├── schema.sql            # SQL DDL skeleton
│   ├── wireframe.png         # wireframe 3 màn hình
│   ├── api-contract.md       # hợp đồng API (track SE)
│   ├── ai-disclosure.md      # bảng khai báo sử dụng công cụ AI
│   └── diagrams/             # ảnh PNG xuất từ các file .drawio
├── src/
│   ├── backend/              
│   └── frontend/             
├── tests/                    
├── .env.example
├── .gitignore
└── README.md
```

## 5. Hướng dẫn cài đặt & chạy

**Yêu cầu:** Node.js ≥ 18, PostgreSQL ≥ 14 (hoặc Docker), npm/pnpm.

```bash
# 1. Clone dự án
git clone https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests.git
cd smartcrm-2374802010521-Receive-and-classify-warranty-requests

# 2. Cấu hình biến môi trường
cp .env.example .env
# điền DB_USER, DB_PASSWORD (không commit file .env)

# 3. Tạo database cục bộ (hoặc chạy PostgreSQL bằng Docker: docker-compose up -d db)
psql -U postgres -c "CREATE DATABASE smartcrm;"

# 4. Chạy backend kiểm tra môi trường
cd src/backend
npm install
node index.js

# 5. Từ BT2: migrate, nạp dữ liệu mẫu và chạy backend
npx prisma migrate dev
npx prisma db seed        # nạp dữ liệu mẫu (tickets_history.csv, ticket_status_log.csv, service_centers.csv...)
npm run start:dev

# 6. Từ BT2: cài đặt & chạy frontend (mở terminal khác)
cd src/frontend
npm install
npm run dev

# 7. Từ BT3: chạy test
cd src/backend
npm run test
```

- Backend mặc định chạy tại http://localhost:3000 (kiểm tra: `/` hiện "Hello Smart CRM", `/db-check` trả về `status: OK`)
- Frontend mặc định chạy tại http://localhost:5173
- Swagger API docs: http://localhost:3000/api-docs

Hiện tại repo chỉ chạy được đến bước 4; các bước 5–7 (Prisma, frontend, test, Swagger, docker-compose) sẽ được bổ sung ở BT2 và BT3.

## 6. Khai báo sử dụng công cụ AI

Bản đầy đủ: [`docs/ai-disclosure.md`](docs/ai-disclosure.md).

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude | Hỗ trợ soạn thảo tài liệu đặc tả (mô tả luồng, user story, use case) từ ý tưởng ban đầu | Đối chiếu lại từng use case với case study gốc và dữ liệu mẫu để đảm bảo đúng phạm vi, không bịa quy tắc nghiệp vụ |
| Claude | Gợi ý cấu trúc bảng dữ liệu (ticket, customer, device, issue_category, ticket_status_log, employee) và ràng buộc khóa chính/khóa ngoại | Đối chiếu với từ điển dữ liệu của case study; chạy thử `docs/schema.sql` trên PostgreSQL cục bộ |
| Claude | Hỗ trợ viết tiêu chí chấp nhận và khung ca kiểm thử cho QT-04, QT-05, QT-06 (hạn cam kết, bảo hành, vòng đời trạng thái) | Tính lại thủ công các ví dụ về hạn cam kết, đối chiếu Bảng 9.1 và đọc lại từng tiêu chí trước khi commit |
| Claude | Hỗ trợ vẽ sơ đồ (use case, kiến trúc, ERD), wireframe và hợp đồng API | Mở lại các file `.drawio` để chỉnh; kiểm tra thuật ngữ nhất quán giữa SRS và sơ đồ bằng Ctrl+F |
