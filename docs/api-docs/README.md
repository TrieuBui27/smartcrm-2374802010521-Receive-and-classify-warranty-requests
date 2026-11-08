# API documentation – Smart CRM L2 (Receive and classify warranty requests)

English version of `docs/api-contract.md` (18 endpoints). Each endpoint has seven parts: method and path, what it does, authentication, parameters, success response, errors, notes.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `http://localhost:3000` (API container); the web app is at `http://localhost:5173` |
| Format | JSON, UTF-8, `Content-Type: application/json`; `snake_case` field names that match the database columns |
| Authentication | `POST /api/auth/login` returns a JWT (HS256, 8 hours). Send `Authorization: Bearer YOUR_TOKEN` on every call except login and `/health`. A missing, malformed, expired or tampered token, or a **locked account**, gives `401 UNAUTHORIZED` (the account is checked on every request) |
| Roles | `NHAN_VIEN_TIEP_NHAN` (receiving staff) and `QUAN_LY_TRUNG_TAM` (center manager) |
| Center scope (QT-14) | Tickets are limited to the center in the token; another center gives `403` |
| Error format | `{"error": {"code": "...", "message": "...", "fields": {...}}}`. System errors `503 DB_UNAVAILABLE` and `500 INTERNAL_ERROR` carry `error.request_id` (also the `X-Request-Id` header) and never a stack trace or SQL |
| Error codes → HTTP | `VALIDATION_FAILED`, `INVALID_PHONE` 400 · `INVALID_CREDENTIALS`, `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND`, `CUSTOMER_NOT_FOUND` 404 · `PHONE_EXISTS`, `SERIAL_EXISTS`, `DEVICE_HAS_OPEN_TICKET`, `DEVICE_HAS_TICKETS` 409 · `INVALID_TRANSITION` 422 |
| Paging | `page` from 1, `size` default 20 and at most 100; response has `items`, `page`, `size`, `total` |
| Dates and phones | Timestamps ISO 8601 with offset (`+07:00`); dates `YYYY-MM-DD`. Phones are normalized to `0xxxxxxxxx` and masked (`090****567`) for receiving staff |
| Order of checks | 401 (token and account) → 403 (role, center) → 400 (input) → 404 / 409 / 422 (business) |

## Endpoint index

| # | Method and path | Purpose |
|---|---|---|
| 1 | `GET /health` | Liveness and database check (used by the Docker healthcheck). |
| 2 | `POST /api/auth/login` | Log in and get a token. |
| 3 | `GET /api/auth/me` | Return the user of the current token (used to restore the session after a page reload). |
| 4 | `GET /api/customers?phone={phone}` | Look up a customer by phone number, with devices (US1). |
| 5 | `POST /api/customers` | Create a customer (US2). |
| 6 | `GET /api/customers/{id}` | Read a customer with devices. |
| 7 | `PATCH /api/customers/{id}` | Update a customer. |
| 8 | `DELETE /api/customers/{id}` | Deactivate a customer (soft delete, QT-13). |
| 9 | `POST /api/customers/{id}/devices` | Add a device to a customer (US2). |
| 10 | `GET /api/devices/{id}` | Read one device. |
| 11 | `PATCH /api/devices/{id}` | Update a device. |
| 12 | `DELETE /api/devices/{id}` | Delete a device entered by mistake. |
| 13 | `GET /api/issue-categories` | List issue categories for the drop-down (US4). |
| 14 | `POST /api/tickets/suggestion` | Suggest category and priority from a description (US4, FR5). |
| 15 | `POST /api/tickets` | Create a warranty ticket (US3, US4, US5). |
| 16 | `GET /api/tickets?status=&center_id=&overdue=&page=&size=` | List tickets sorted by due date, ascending (US6). |
| 17 | `GET /api/tickets/{id}` | Read a ticket with its status log (US6, US7). |
| 18 | `PATCH /api/tickets/{id}/status` | Move a ticket to another status (US7). |

## Endpoints

### 1. `GET /health`

1. **Method and path:** `GET /health`
2. **What it does:** Liveness and database check (used by the Docker healthcheck).
3. **Authentication:** None.
4. **Parameters:** None.
5. **Success response:** `200` `{"status":"ok","db":"ok"}`.
6. **Errors:** `503` when the database cannot be queried.
7. **Notes:** Does not need a token.

### 2. `POST /api/auth/login`

1. **Method and path:** `POST /api/auth/login`
2. **What it does:** Log in and get a token.
3. **Authentication:** None (public).
4. **Parameters:** JSON `username`, `password` (both required).
5. **Success response:** `200` `{access_token, token_type:"Bearer", expires_in:28800, user:{employee_id, full_name, role, center_id}}`.
6. **Errors:** `400 VALIDATION_FAILED` missing field; `401 INVALID_CREDENTIALS` wrong user, wrong password or locked account (same message for all three).
7. **Notes:** Token is HS256 and lives 8 hours.

### 3. `GET /api/auth/me`

1. **Method and path:** `GET /api/auth/me`
2. **What it does:** Return the user of the current token (used to restore the session after a page reload).
3. **Authentication:** Bearer token, any role.
4. **Parameters:** None.
5. **Success response:** `200` `{employee_id, role, center_id}`.
6. **Errors:** `401 UNAUTHORIZED`.
7. **Notes:** Role and center come from the database, not from the token.

### 4. `GET /api/customers?phone={phone}`

1. **Method and path:** `GET /api/customers?phone={phone}`
2. **What it does:** Look up a customer by phone number, with devices (US1).
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** Query `phone` (any format; normalized to `0xxxxxxxxx`).
5. **Success response:** `200` customer with `devices[]` (`device_id, device_name, serial_no, purchase_date, warranty_months`).
6. **Errors:** `400 INVALID_PHONE`; `404 CUSTOMER_NOT_FOUND`; `401`; `403`.
7. **Notes:** Phone is masked (`090****567`) for receiving staff (QT-15). Use the number you typed, not the returned one.

### 5. `POST /api/customers`

1. **Method and path:** `POST /api/customers`
2. **What it does:** Create a customer (US2).
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** JSON `full_name` (1-120, required), `phone` (required, `^0[0-9]{9}$` after normalizing), `email`, `address`.
5. **Success response:** `201` `{customer_id, full_name, phone}`.
6. **Errors:** `400 VALIDATION_FAILED`; `409 PHONE_EXISTS` with `error.existing_customer`; `401`; `403`.
7. **Notes:** Phone is unique (QT-01).

### 6. `GET /api/customers/{id}`

1. **Method and path:** `GET /api/customers/{id}`
2. **What it does:** Read a customer with devices.
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** Path `id`.
5. **Success response:** `200` customer with devices.
6. **Errors:** `404 NOT_FOUND`; `401`; `403`.
7. **Notes:** Deactivated customers are not returned (QT-13).

### 7. `PATCH /api/customers/{id}`

1. **Method and path:** `PATCH /api/customers/{id}`
2. **What it does:** Update a customer.
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** JSON with one or more of `full_name`, `phone`, `email`, `address`.
5. **Success response:** `200` updated customer.
6. **Errors:** `400 VALIDATION_FAILED` (also empty body); `404`; `409 PHONE_EXISTS`; `401`; `403`.
7. **Notes:** Phone uniqueness is still checked.

### 8. `DELETE /api/customers/{id}`

1. **Method and path:** `DELETE /api/customers/{id}`
2. **What it does:** Deactivate a customer (soft delete, QT-13).
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** Path `id`.
5. **Success response:** `204` no body.
6. **Errors:** `404 NOT_FOUND`; `401`; `403`.
7. **Notes:** After this, new tickets for the customer's devices are refused with `404 CUSTOMER_NOT_FOUND`.

### 9. `POST /api/customers/{id}/devices`

1. **Method and path:** `POST /api/customers/{id}/devices`
2. **What it does:** Add a device to a customer (US2).
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** JSON `device_name` (required), `serial_no` (1-50, required), `purchase_date` (`YYYY-MM-DD`, not in the future, may be null), `warranty_months` (1-60, default 12).
5. **Success response:** `201` the device `{device_id, customer_id, device_name, serial_no, purchase_date, warranty_months}`.
6. **Errors:** `400 VALIDATION_FAILED`; `404 CUSTOMER_NOT_FOUND`; `409 SERIAL_EXISTS` with `error.existing_device_id`; `401`; `403`.
7. **Notes:** Serial is unique and compared **ignoring case** (QT-03, BUG-006).

### 10. `GET /api/devices/{id}`

1. **Method and path:** `GET /api/devices/{id}`
2. **What it does:** Read one device.
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** Path `id`.
5. **Success response:** `200` device.
6. **Errors:** `404 NOT_FOUND`; `401`; `403`.
7. **Notes:** -

### 11. `PATCH /api/devices/{id}`

1. **Method and path:** `PATCH /api/devices/{id}`
2. **What it does:** Update a device.
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** JSON with one or more of `device_name`, `serial_no`, `purchase_date`, `warranty_months`.
5. **Success response:** `200` updated device.
6. **Errors:** `400 VALIDATION_FAILED` (also empty body); `404`; `409 SERIAL_EXISTS`; `401`; `403`.
7. **Notes:** Serial uniqueness is still checked, ignoring case.

### 12. `DELETE /api/devices/{id}`

1. **Method and path:** `DELETE /api/devices/{id}`
2. **What it does:** Delete a device entered by mistake.
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** Path `id`.
5. **Success response:** `204` no body.
6. **Errors:** `404 NOT_FOUND`; `409 DEVICE_HAS_TICKETS` when the device already has tickets; `401`; `403`.
7. **Notes:** Keeps the warranty history of devices that have tickets.

### 13. `GET /api/issue-categories`

1. **Method and path:** `GET /api/issue-categories`
2. **What it does:** List issue categories for the drop-down (US4).
3. **Authentication:** Bearer token; both roles.
4. **Parameters:** None.
5. **Success response:** `200` `[{category_id, category_name, default_priority}]`.
6. **Errors:** `401`.
7. **Notes:** Keywords are not returned.

### 14. `POST /api/tickets/suggestion`

1. **Method and path:** `POST /api/tickets/suggestion`
2. **What it does:** Suggest category and priority from a description (US4, FR5).
3. **Authentication:** Bearer token; receiving staff.
4. **Parameters:** JSON `issue_desc` (10-2000 characters).
5. **Success response:** `200` `{category_id, category_name, priority}`; the category `KHAC` when no keyword matches.
6. **Errors:** `400 VALIDATION_FAILED`; `401`; `403`.
7. **Notes:** Keyword rules, no machine learning.

### 15. `POST /api/tickets`

1. **Method and path:** `POST /api/tickets`
2. **What it does:** Create a warranty ticket (US3, US4, US5).
3. **Authentication:** Bearer token; receiving staff only.
4. **Parameters:** JSON `customer_id`, `device_id`, `issue_desc` (required); `center_id`, `category_id`, `priority`, `accessories` (optional).
5. **Success response:** `201` the full ticket (18 fields) with a `status_log` of one row `MOI`; `ticket_code` is `BH-nnnnnn/year`, `due_date` is set by the system.
6. **Errors:** `400 VALIDATION_FAILED`; `401`; `403`; `404 NOT_FOUND` device missing; `404 CUSTOMER_NOT_FOUND` customer deactivated; `409 DEVICE_HAS_OPEN_TICKET` with `error.open_ticket_code`.
7. **Notes:** Due date 24/72/120 hours, Sunday not counted (QT-04). Warranty from purchase date (QT-05).

### 16. `GET /api/tickets?status=&center_id=&overdue=&page=&size=`

1. **Method and path:** `GET /api/tickets?status=&center_id=&overdue=&page=&size=`
2. **What it does:** List tickets sorted by due date, ascending (US6).
3. **Authentication:** Bearer token; both roles.
4. **Parameters:** Query `status`, `center_id` (must equal the token's), `overdue` (true/false), `page` (from 1), `size` (1-100, default 20).
5. **Success response:** `200` `{items[], page, size, total}`; each ticket has 18 fields incl. `is_overdue`.
6. **Errors:** `400 VALIDATION_FAILED`; `401`; `403` other center.
7. **Notes:** Only the center in the token (QT-14). Phone is masked for receiving staff.

### 17. `GET /api/tickets/{id}`

1. **Method and path:** `GET /api/tickets/{id}`
2. **What it does:** Read a ticket with its status log (US6, US7).
3. **Authentication:** Bearer token; both roles.
4. **Parameters:** Path `id`.
5. **Success response:** `200` ticket + `status_log[]` (`from_status, to_status, changed_at, changed_by_name, note`) + `allowed_transitions[]` for the current user.
6. **Errors:** `401`; `403` other center; `404 NOT_FOUND`.
7. **Notes:** The UI draws buttons only for `allowed_transitions`.

### 18. `PATCH /api/tickets/{id}/status`

1. **Method and path:** `PATCH /api/tickets/{id}/status`
2. **What it does:** Move a ticket to another status (US7).
3. **Authentication:** Bearer token; receiving staff may only set `DA_DONG`, `DA_HUY`; center manager any allowed move.
4. **Parameters:** JSON `to_status` (required), `note`.
5. **Success response:** `200` the ticket with the new status and the new log row.
6. **Errors:** `400 VALIDATION_FAILED`; `401`; `403`; `404`; `422 INVALID_TRANSITION` for a move outside the life cycle or backwards (QT-06).
7. **Notes:** Allowed: MOI→DA_PHAN_CONG, DA_HUY; DA_PHAN_CONG→DANG_XU_LY, DA_HUY; DANG_XU_LY→CHO_LINH_KIEN, HOAN_TAT; CHO_LINH_KIEN→HOAN_TAT; HOAN_TAT→DA_DONG.

## Example – create a ticket

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1024,"device_id":3311,"issue_desc":"Máy sạc không vào, cắm sạc báo lỗi phụ kiện","accessories":["SAC","HOP"]}'
```

`201` (shortened):

```json
{ "ticket_id": 88231, "ticket_code": "BH-000231/2026", "status": "MOI",
  "category_name": "SAC", "priority": "TRUNG_BINH",
  "is_warranty": true, "warranty_verified": true,
  "received_at": "2026-09-08T14:30:00+07:00", "due_date": "2026-09-11T14:30:00+07:00" }
```

`409` when the device already has an open ticket:

```json
{ "error": { "code": "DEVICE_HAS_OPEN_TICKET", "message": "Thiết bị đang có phiếu chưa đóng.", "open_ticket_code": "BH-000231/2026" } }
```