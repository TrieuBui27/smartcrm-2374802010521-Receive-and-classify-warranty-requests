-- Bảng ticket_status_log theo DDL BT1. Mỗi lần chuyển trạng thái ghi một dòng (NFR4).
CREATE TABLE IF NOT EXISTS ticket_status_log (
  log_id      BIGSERIAL PRIMARY KEY,
  ticket_id   BIGINT      NOT NULL REFERENCES ticket(ticket_id),
  from_status VARCHAR(20),                    -- NULL ở lần đầu
  to_status   VARCHAR(20) NOT NULL,
  changed_at  TIMESTAMP   NOT NULL DEFAULT now(),
  changed_by  BIGINT      NOT NULL REFERENCES employee(employee_id),
  note        VARCHAR(255)
);