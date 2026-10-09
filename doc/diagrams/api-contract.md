# Hợp đồng API – Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Thuật ngữ dùng đúng Bảng thuật ngữ ở `srs.md`. Tên trường trùng tên cột trong `erd.drawio` / `schema.sql`.

## 1. Danh sách endpoint

| Phương thức | Đường dẫn | Mục đích | User Story |
|---|---|---|---|
| GET | `/api/customers?phone={phone}` | Tra cứu khách hàng theo số điện thoại, kèm danh sách thiết bị | US1 |
| POST | `/api/customers` | Tạo khách hàng mới | US2 |
| POST | `/api/customers/{id}/devices` | Ghi nhận thiết bị của khách hàng | US2 |
| GET | `/api/issue-categories` | Lấy danh sách nhóm sự cố cho ô chọn | US5 |
| POST | `/api/tickets/suggestion` | Đề xuất nhóm sự cố và mức ưu tiên từ mô tả lỗi | US5 |
| POST | `/api/tickets` | Tạo phiếu bảo hành (kèm tình trạng bảo hành, nhóm sự cố, hạn cam kết) | US3, US4, US5, US6 |
| GET | `/api/tickets?status=&center_id=&overdue=&page=&size=` | Danh sách phiếu, có lọc và phân trang | US7 |
| GET | `/api/tickets/{id}` | Chi tiết phiếu kèm nhật ký trạng thái | US7, US8 |
| PATCH | `/api/tickets/{id}/status` | Chuyển trạng thái phiếu | US8 |

## 2. Quy ước chung

- JSON, UTF-8, header `Content-Type: application/json`.
- Tên trường `snake_case`, khớp tên cột.
- Thời gian ISO 8601 kèm múi giờ, ví dụ `2026-09-08T14:30:00+07:00`.
- Tiền tệ (nếu có): số nguyên VND.
- Phân trang: `page` (từ 1), `size` (mặc định 20, tối đa 100); response kèm `total`.
- Số điện thoại nhập vào được chuẩn hóa về `0xxxxxxxxx` (QT-02). Response che dạng `090****567` với vai trò khác Quản lý trung tâm và Ban giám đốc (QT-15).
- Mọi lỗi cùng cấu trúc: `{ "error": { "code": "...", "message": "...", "fields": {...} } }`.

## 3. Chi tiết endpoint (US mức MUST: US1, US4, US6, US8)

### GET /api/customers?phone={phone} · US1

- **200 OK**
```json
{ "customer_id": 1024, "full_name": "Nguyễn Văn An", "phone": "090****567",
  "devices": [ { "device_id": 3311, "device_name": "iPhone 13", "serial_no": "356123456789012",
                 "purchase_date": "2026-03-05", "warranty_months": 12 } ] }
```
- **400** `INVALID_PHONE` – không chuẩn hóa được về 10 chữ số.
- **404** `CUSTOMER_NOT_FOUND` – chưa có hồ sơ (giao diện mời tạo mới, UC2).

### POST /api/customers · US2

Request: `{ "full_name": "Nguyễn Văn An", "phone": "0901 234 567", "email": null, "address": null }`

- **201 Created** – trả hồ sơ vừa tạo (`customer_id`, `full_name`, `phone`).
- **400** `VALIDATION_FAILED` – thiếu `full_name` hoặc `phone`.
- **409** `PHONE_EXISTS` – số đã tồn tại (QT-01); kèm hồ sơ có sẵn trong `error.existing_customer`.

### POST /api/customers/{id}/devices · US2

Request: `{ "device_name": "iPhone 13", "serial_no": "356123456789012", "purchase_date": "2026-03-05", "warranty_months": 12 }`

- **201 Created** – trả thiết bị vừa tạo.
- **400** `VALIDATION_FAILED`.
- **404** `CUSTOMER_NOT_FOUND`.
- **409** `SERIAL_EXISTS` – serial/IMEI đã thuộc một khách hàng (QT-03).

### POST /api/tickets · US3, US4, US5, US6

Request:
```json
{ "customer_id": 1024, "device_id": 3311, "center_id": 2,
  "issue_desc": "Máy sạc không vào, cắm sạc báo lỗi phụ kiện",
  "category_id": null, "priority": null, "accessories": ["SAC", "HOP"] }
```
`category_id` và `priority` để `null` thì hệ thống dùng giá trị đề xuất (FR5).

- **201 Created**
```json
{ "ticket_id": 88231, "ticket_code": "BH-000231/2026", "status": "MOI",
  "category_id": 3, "priority": "TRUNG_BINH",
  "is_warranty": true, "warranty_verified": true,
  "received_at": "2026-09-08T14:30:00+07:00", "due_date": "2026-09-11T14:30:00+07:00" }
```
`due_date` luôn do hệ thống sinh (QT-04); nếu request có gửi `due_date` thì bị bỏ qua. `warranty_verified = false` khi thiếu ngày mua (QT-05).
- **400** `VALIDATION_FAILED` – xem bảng validation.
- **404** `NOT_FOUND` – `customer_id` hoặc `device_id` không tồn tại.
- **409** `DEVICE_HAS_OPEN_TICKET` – thiết bị đang có phiếu chưa đóng (QN-01); kèm `error.open_ticket_code`.

### PATCH /api/tickets/{id}/status · US8

Request: `{ "to_status": "DANG_XU_LY", "note": "Bắt đầu kiểm tra" }`

- **200 OK** – trả phiếu với `status` mới và dòng nhật ký vừa ghi.
- **404** `NOT_FOUND`.
- **422** `INVALID_TRANSITION` – chuyển ngoài vòng đời hoặc quay lại (QT-06); dữ liệu không đổi.
- **403** `FORBIDDEN` – vai trò không được chuyển sang trạng thái đó (Nhân viên tiếp nhận chỉ được DA_DONG, DA_HUY).

Chuyển được phép: MOI→DA_PHAN_CONG, MOI→DA_HUY, DA_PHAN_CONG→DANG_XU_LY, DA_PHAN_CONG→DA_HUY, DANG_XU_LY→CHO_LINH_KIEN, DANG_XU_LY→HOAN_TAT, CHO_LINH_KIEN→HOAN_TAT, HOAN_TAT→DA_DONG.

### Các endpoint còn lại (SHOULD)

- `GET /api/tickets`: 200 (`items`, `page`, `size`, `total`, sắp theo `due_date` tăng dần), 400 tham số sai, 403 xem trung tâm khác (QT-14).
- `GET /api/tickets/{id}`: 200 (phiếu + `status_log`), 404.
- `POST /api/tickets/suggestion` (`{ "issue_desc": "..." }`): 200 `{ category_id, category_name, priority }`, 400.
- `GET /api/issue-categories`: 200 danh sách nhóm đang dùng.

## 4. Bảng validation – POST /api/tickets

| Trường | Bắt buộc | Kiểu / ràng buộc | Thông báo lỗi |
|---|---|---|---|
| customer_id | Có | Số nguyên dương, phải tồn tại | Không tìm thấy khách hàng |
| device_id | Có | Số nguyên dương, phải thuộc `customer_id` (QT-03) | Thiết bị không thuộc về khách hàng này |
| center_id | Không | Số nguyên dương; bỏ trống thì dùng `center_id` của token; khác token thì 403 | Trung tâm bảo hành không hợp lệ |
| issue_desc | Có | Chuỗi 10–2000 ký tự | Mô tả lỗi phải có từ 10 đến 2000 ký tự |
| category_id | Không | Số nguyên, thuộc `issue_category` đang dùng | Nhóm sự cố không hợp lệ |
| priority | Không | CAO / TRUNG_BINH / THAP | Mức ưu tiên không hợp lệ |
| accessories | Không | Mảng, mỗi phần tử thuộc SAC / TAI_NGHE / HOP / KHAC | Phụ kiện không hợp lệ |

## 5. Bảng validation – POST /api/customers và /devices

| Trường | Bắt buộc | Kiểu / ràng buộc | Thông báo lỗi |
|---|---|---|---|
| full_name | Có | Chuỗi 1–120 ký tự | Họ tên là bắt buộc |
| phone | Có | Sau chuẩn hóa khớp `^0[0-9]{9}$`, duy nhất | Số điện thoại không hợp lệ |
| email | Không | Chuỗi ≤ 120 ký tự, đúng dạng email | Email không hợp lệ |
| device_name | Có | Chuỗi 1–120 ký tự | Tên thiết bị là bắt buộc |
| serial_no | Có | Chuỗi 1–50 ký tự, duy nhất | Serial/IMEI là bắt buộc |
| purchase_date | Không | Ngày, không sau hôm nay | Ngày mua không hợp lệ |
| warranty_months | Không | 1–60, mặc định 12 | Số tháng bảo hành không hợp lệ |

## 6. Xác thực và phân quyền

| Endpoint | Nhân viên tiếp nhận | Quản lý trung tâm |
|---|---|---|
| Tra cứu / tạo khách hàng, thiết bị | ✔ | ✘ |
| Tạo phiếu, đề xuất nhóm sự cố | ✔ | ✘ |
| Xem danh sách, chi tiết phiếu (trung tâm mình) | ✔ | ✔ |
| Chuyển trạng thái | Chỉ DA_DONG, DA_HUY | Mọi chuyển được phép (A4: Quản lý cập nhật thay kỹ thuật viên) |

Xác thực: header `Authorization: Bearer <access_token>`; token chứa `user_id` (employee_id), `role` (NHAN_VIEN_TIEP_NHAN hoặc QUAN_LY_TRUNG_TAM) và `center_id`. Việc cấp token nằm ngoài phạm vi L2 (đăng nhập chi tiết là WON'T). Phiếu của trung tâm khác bị 403 (QT-14).
