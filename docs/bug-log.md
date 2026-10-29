# Bug Log – Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Mỗi mục ghi theo bốn bước gỡ lỗi của buổi 11: **tái lập → khoanh vùng → sửa nguyên nhân → xác nhận bằng test**. Mức độ: **Critical** (hệ thống ngừng chạy hoặc mất dữ liệu), **Major** (một chức năng chính cho kết quả sai), **Minor** (sai ở chỗ phụ, có cách tránh).

Repo: `https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests`

| Mã | Mức độ | Tóm tắt | Commit sửa |
|---|---|---|---|
| BUG-001 | Major | Hạn cam kết và thời điểm tiếp nhận lệch 7 giờ tùy máy chạy | `aa43cbd` |
| BUG-002 | Critical | Backend tắt hẳn khi PostgreSQL tắt hoặc khởi động lại | `768d08b` |
| BUG-003 | Minor | Ngày mua thiết bị lùi một ngày trên máy đặt giờ Việt Nam | `1eb2054` |

## BUG-001 · Major — Hạn cam kết và thời điểm tiếp nhận lệch 7 giờ tùy máy chạy

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-001 · Major (hạn cam kết QT-04 và đánh dấu quá hạn là chức năng chính của UC5, UC9) |
| 2. Phát hiện bởi | Kiểm thử repository trên PostgreSQL thật `tests/ticket.repository.test.js` (buổi 9–10) |
| 3. Triệu chứng | Phiếu tạo lúc 14:30 thứ Ba giờ Việt Nam, hạn cam kết 72 giờ phải là 14:30 thứ Sáu (`2026-09-11T07:30:00.000Z`) nhưng đọc lại thành `2026-09-11T14:30:00.000Z`, muộn 7 giờ; cùng dữ liệu nhưng máy khác múi giờ cho kết quả khác |
| 4. Cách tái lập | Đặt múi giờ máy là UTC, dùng `db/pool.js` của commit trước `aa43cbd`, chạy `node --test tests/ticket.repository.test.js` (cần CSDL đã migrate và seed): test báo `expected '2026-09-11T07:30:00.000Z'`, `actual '2026-09-11T14:30:00.000Z'` |
| 5. Nguyên nhân | Cột `received_at`, `due_date`, `changed_at` kiểu `TIMESTAMP` không lưu múi giờ. Thư viện `pg` hiểu giá trị đọc ra theo múi giờ của **máy chạy Node**, còn `now()` của PostgreSQL theo múi giờ của **máy chủ CSDL**; hệ thống chưa có quy ước múi giờ duy nhất nên ghi bằng một múi, đọc bằng múi khác |
| 6. Cách sửa | Chọn một quy ước: mọi cột `TIMESTAMP` lưu giờ Việt Nam (khớp bộ dữ liệu). `db/pool.js` đặt `TimeZone=Asia/Ho_Chi_Minh` cho phiên làm việc và đọc `TIMESTAMP` thành `Date` có `+07:00`; repository đổi `Date` sang giờ Việt Nam bằng `toDbTime()` trước khi ghi. Ghi vào TD-12 |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/aa43cbd1b5f5d6568695e82044f728fe2f4948ff — câu kiểm `due_date ... giờ VN đọc ra đúng` trong `tests/ticket.repository.test.js` FAIL với `pool.js` cũ, PASS sau khi sửa (chạy với `TZ=UTC`) |

## BUG-002 · Critical — Backend tắt hẳn khi PostgreSQL tắt hoặc khởi động lại

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-002 · Critical (toàn bộ API ngừng phục vụ, kể cả khi CSDL đã bật lại, phải khởi động backend bằng tay) |
| 2. Phát hiện bởi | Phép thử "suy giảm có kiểm soát" của buổi 11–12: tắt một thành phần phụ trợ (PostgreSQL) rồi thử lại nghiệp vụ chính |
| 3. Triệu chứng | Đang chạy `npm start` và đã đăng nhập, tắt PostgreSQL: cửa sổ backend in `Unhandled 'error' event` … `terminating connection due to administrator command` (mã `57P01`) rồi thoát. Giao diện chỉ còn báo "Không kết nối được tới hệ thống"; bật lại PostgreSQL vẫn không dùng được vì backend đã tắt |
| 4. Cách tái lập | `npm start` → đăng nhập và mở danh sách phiếu (pool giữ một kết nối rảnh) → tắt dịch vụ PostgreSQL (`docker stop` hoặc Services trên Windows) → tiến trình Node thoát ngay |
| 5. Nguyên nhân | Khi máy chủ CSDL cắt kết nối, kết nối **đang rảnh** trong `pg.Pool` phát sự kiện `error` trên đối tượng pool. Mã không đăng ký hàm nghe `pool.on('error')`, nên theo quy tắc của `EventEmitter` Node coi đây là lỗi chưa xử lý và tắt tiến trình. Thêm vào đó pool không có thời gian chờ kết nối nên khi CSDL không trả lời yêu cầu có thể treo |
| 6. Cách sửa | `db/pool.js`: đăng ký `pool.on('error')` ghi log WARN (pool tự bỏ kết nối hỏng, mở kết nối mới ở yêu cầu sau); thêm `connectionTimeoutMillis: 5000` và `query_timeout`. Commit kế tiếp `2e4b7c2` cho middleware lỗi trả **503 `DB_UNAVAILABLE`** kèm `request_id` thay vì 500 chung chung |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/768d08bc648e2bb6be112d72dad09a0a53c9aaf5 — `tests/db.pool.test.js` (pool có hàm nghe `error`, phát lỗi `57P01` không làm sập, có thời gian chờ) FAIL 2/3 trước khi sửa, PASS sau. Chạy thật: tắt PostgreSQL → API trả 503, backend vẫn sống; bật lại → API trả 200 không cần khởi động lại |

## BUG-003 · Minor — Ngày mua thiết bị lùi một ngày trên máy đặt giờ Việt Nam

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-003 · Minor (sai dữ liệu hiển thị ở API tra cứu khách; kiểm tra bảo hành QT-05 khi tạo phiếu không bị ảnh hưởng) |
| 2. Phát hiện bởi | Đối chiếu phản hồi `GET /api/customers?phone=` với ví dụ trong `docs/api-contract.md` khi viết CRUD thiết bị (buổi 11–12) |
| 3. Triệu chứng | CSDL lưu `purchase_date = 2024-10-13` nhưng API trả `"purchase_date": "2024-10-12T17:00:00.000Z"`: lùi một ngày và sai dạng `YYYY-MM-DD` của hợp đồng API |
| 4. Cách tái lập | Đặt múi giờ máy là Asia/Ho_Chi_Minh (mặc định trên máy Windows ở Việt Nam). Chạy `TZ=Asia/Ho_Chi_Minh node --test tests/db.pool.test.js` với `pool.js` trước commit sửa: test BUG-003 FAIL. Hoặc gọi API tra cứu khách 0974 799 148 (khách 84) có thiết bị `SN281481716773` |
| 5. Nguyên nhân | Thư viện `pg` mặc định đổi cột `DATE` (mã kiểu 1082) thành `Date` lúc 0 giờ **theo múi giờ máy chạy**; `JSON.stringify` đổi `Date` sang UTC nên 0 giờ ngày 13 giờ Việt Nam thành 17 giờ ngày 12. Phiếu không bị vì `ticket.repository.js` đã ép `purchase_date::text`, còn `customer.repository.js` thì không |
| 6. Cách sửa | Sửa tận gốc một chỗ thay vì ép `::text` ở từng câu SQL: `db/pool.js` đặt `types.setTypeParser(1082, v => v)` để mọi truy vấn trả nguyên chuỗi `YYYY-MM-DD` |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/1eb20548f1503f3be146b14206c28bf5b6d582cd — test "BUG-003: cột DATE đọc ra đúng chuỗi YYYY-MM-DD" trong `tests/db.pool.test.js` FAIL trước, PASS sau (chạy với `TZ=Asia/Ho_Chi_Minh`); API trả `"purchase_date": "2024-10-13"` |
