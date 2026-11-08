# Bug Log – Luồng L2: Tiếp nhận và phân loại yêu cầu bảo hành

Mỗi mục ghi theo bốn bước gỡ lỗi của buổi 11: **tái lập → khoanh vùng → sửa nguyên nhân → xác nhận bằng test**. Mức độ: **Critical** (hệ thống ngừng chạy, mất dữ liệu hoặc cho truy cập trái phép), **Major** (một chức năng chính cho kết quả sai), **Minor** (sai ở chỗ phụ, có cách tránh).

Repo: `https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests`

| Mã | Mức độ | Tóm tắt | Commit sửa |
|---|---|---|---|
| BUG-001 | Major | Hạn cam kết và thời điểm tiếp nhận lệch 7 giờ tùy máy chạy | `aa43cbd` |
| BUG-002 | Critical | Backend tắt hẳn khi PostgreSQL tắt hoặc khởi động lại | `768d08b` |
| BUG-003 | Minor | Ngày mua thiết bị lùi một ngày trên máy đặt giờ Việt Nam | `1eb2054` |
| BUG-004 | Critical | Tài khoản bị khóa nhưng token cũ vẫn dùng được tới 8 giờ | `d335bfc` |
| BUG-005 | Major | Khách đã xóa mềm vẫn lập được phiếu bảo hành mới | `25c20ba` |
| BUG-006 | Major | Serial/IMEI chỉ khác hoa thường vẫn được lưu thành hai thiết bị | `b896bd0` |
| BUG-007 | Major | Thư viện body-parser và qs có lỗ hổng đã công bố (npm audit) | `6cdb38b` |

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

## BUG-004 · Critical — Tài khoản bị khóa nhưng token cũ vẫn dùng được tới 8 giờ

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-004 · Critical (người đã bị khóa vẫn đọc được dữ liệu phiếu và khách hàng: truy cập trái phép, thuộc A07 và A01 của OWASP Top 10) |
| 2. Phát hiện bởi | TC-08 (`tests/tc.api.test.js`), kiểm thử bảo mật buổi 14 |
| 3. Triệu chứng | Nhân viên đăng nhập, nhận token; quản trị khóa tài khoản (`is_active = false`); cùng token gọi `GET /api/tickets` vẫn nhận **200** thay vì **401** (`expected 401, actual 200`), và còn dùng được tới khi token hết hạn sau 8 giờ |
| 4. Cách tái lập | Ở commit `8b04b71`, chạy `cd src/backend` rồi `node --test --test-name-pattern="TC-08 " ../../tests/tc.api.test.js` (cần CSDL đã migrate và seed): test báo `200 !== 401` |
| 5. Nguyên nhân | `middleware/authenticate.js` chỉ gọi `verifyToken`, tức chỉ kiểm chữ ký và hạn của JWT rồi tin luôn `role` và `center_id` trong token. Không có chỗ nào đọc lại bảng `employee` sau khi đăng nhập, nên trạng thái khóa chỉ được kiểm ở lúc đăng nhập |
| 6. Cách sửa | Thêm `findById` ở `auth.repository.js` và `currentUser` ở `auth.service.js`: mỗi yêu cầu có token đều tra lại `employee`; không còn hoặc `is_active = false` thì 401 `UNAUTHORIZED`; vai trò và trung tâm lấy từ CSDL nên đổi quyền cũng có hiệu lực ngay. `middleware/authenticate.js` dùng `currentUser` |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/d335bfc — TC-08 FAIL (`200 !== 401`) trước khi sửa, PASS sau; toàn bộ test 80/82 pass ở commit này (còn TC-09, TC-11 đang chờ sửa) |

## BUG-005 · Major — Khách đã xóa mềm vẫn lập được phiếu bảo hành mới

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-005 · Major (vi phạm QT-13 ở chức năng chính UC3: lập phiếu cho khách không còn tồn tại trong hệ thống) |
| 2. Phát hiện bởi | TC-09 (`tests/tc.integration.test.js`), kiểm thử chất lượng dữ liệu buổi 14 |
| 3. Triệu chứng | Khách bị xóa mềm (`customer.is_active = false`) nhưng `TicketService.create` cho thiết bị của khách đó vẫn lưu phiếu thành công; test mong đợi lỗi `CUSTOMER_NOT_FOUND` hoặc `NOT_FOUND` và nhận `Missing expected rejection` (không có lỗi nào) |
| 4. Cách tái lập | Ở commit `8b04b71`, chạy `node --test --test-name-pattern="TC-09 " ../../tests/tc.integration.test.js` trong `src/backend`. Cách tay: xóa mềm một khách có thiết bị chưa có phiếu mở rồi `POST /api/tickets` với `customer_id`, `device_id` của khách đó: nhận 201 |
| 5. Nguyên nhân | `ticket.repository.findDeviceById` chỉ đọc bảng `device`, không nối bảng `customer`; `TicketService.create` chỉ kiểm thiết bị tồn tại và thuộc đúng `customer_id`. Không chỗ nào kiểm tra khách còn hoạt động, trong khi các hàm tra cứu khách đều lọc `is_active` |
| 6. Cách sửa | `findDeviceById` nối `customer` và trả thêm `customer_active`; `TicketService.create` ném `CUSTOMER_NOT_FOUND` (404) khi `customer_active === false`, trước mọi bước ghi |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/25c20ba — TC-09 FAIL trước khi sửa, PASS sau; sau khi kiểm tra, không có phiếu nào được lưu cho khách đã xóa |

## BUG-006 · Major — Serial/IMEI chỉ khác hoa thường vẫn được lưu thành hai thiết bị

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-006 · Major (vi phạm QT-03 "serial/IMEI không trùng": cùng một máy thật có hai hồ sơ, có thể lập hai phiếu bảo hành cho cùng một máy) |
| 2. Phát hiện bởi | TC-11 (`tests/tc.integration.test.js`), kiểm thử dữ liệu sai buổi 14 |
| 3. Triệu chứng | Đã có thiết bị serial `TC11-SN-0001`; tạo thiết bị thứ hai với serial `tc11-sn-0001` vẫn thành công thay vì `409 SERIAL_EXISTS`; test báo `Missing expected rejection` |
| 4. Cách tái lập | Ở commit `8b04b71`, chạy `node --test --test-name-pattern="TC-11 " ../../tests/tc.integration.test.js` trong `src/backend`. Cách tay: `POST /api/customers/{id}/devices` hai lần với `serial_no` là `ABC123` rồi `abc123`: cả hai nhận 201 |
| 5. Nguyên nhân | Ràng buộc `UNIQUE(serial_no)` của PostgreSQL và hàm `findBySerial` (`WHERE serial_no = $1`) đều so sánh từng ký tự, phân biệt hoa thường; service chỉ `trim()` serial, không chuẩn hóa. Nhân viên gõ `abc123` thay vì `ABC123` là thành thiết bị trùng |
| 6. Cách sửa | `findBySerial` so sánh `UPPER(serial_no) = UPPER($1)`; thêm migration `008_unique_device_serial_ci.sql` tạo chỉ mục duy nhất trên `UPPER(serial_no)` để CSDL cũng chặn khi hai yêu cầu đến cùng lúc; `create` dùng `ON CONFLICT DO NOTHING` (không chỉ định cột) nên bắt cả hai chỉ mục |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/b896bd0 — TC-11 FAIL trước khi sửa, PASS sau; `npm test` 82/82 pass, 0 fail |

## BUG-007 · Major — Thư viện body-parser và qs có lỗ hổng đã công bố

| Dòng | Nội dung |
|---|---|
| 1. Mã và mức độ | BUG-007 · Major (npm audit xếp body-parser mức High và qs mức Moderate; chưa tái hiện được tấn công trên cấu hình này nên không xếp Critical) |
| 2. Phát hiện bởi | `npm audit --omit=dev` ở `src/backend`, khi điền mục 7 của checklist bảo mật BT3 (phụ thuộc được ghim phiên bản và đã cảnh báo lỗ hổng) |
| 3. Triệu chứng | `npm audit --omit=dev` báo 2 lỗ hổng (1 moderate, 1 high): `body-parser` 2.0.0 đến 2.3.0 (GHSA-27r3-jxmh-p828, từ chối dịch vụ bằng byte thừa phía sau thân yêu cầu nén) và `qs` 6.7.0 đến 6.16.0 (GHSA-6pq8-jhm2-2vcw, `qs.stringify` ném `TypeError` không bắt được). Phần giao diện `src/frontend` chạy `npm audit` ra 0 lỗ hổng |
| 4. Cách tái lập | Ở commit trước `6cdb38b`: `cd src/backend`, `npm ci`, rồi `npm audit --omit=dev` |
| 5. Nguyên nhân | `body-parser` và `qs` là thư viện gián tiếp của `express`. `package-lock.json` khóa chúng ở bản có lỗ hổng; lỗ hổng được công bố sau khi tệp khóa được tạo và dự án chưa có bước nào chạy `npm audit` nên không ai biết |
| 6. Cách sửa | Chạy `npm audit fix` trong `src/backend`: nâng `body-parser` và `qs` lên bản đã vá. Chỉ đổi `package-lock.json` (9 dòng thêm, 9 dòng xóa), không đổi `package.json` hay mã nguồn |
| 7. Commit và xác nhận | https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests/commit/6cdb38bbdc1f19660af5493304756eb6f1551a60 — `npm audit --omit=dev` từ 2 lỗ hổng xuống `found 0 vulnerabilities`; `npm test` vẫn 82/82 pass, luồng đang chạy không bị vỡ |