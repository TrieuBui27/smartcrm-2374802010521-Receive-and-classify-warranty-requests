-- Bảng ticket theo DDL BT1. Chỉ mục ux_ticket_device_open bảo đảm QN-01.
CREATE TABLE IF NOT EXISTS ticket (
  ticket_id         BIGSERIAL PRIMARY KEY,
  ticket_code       VARCHAR(20) NOT NULL UNIQUE,  -- BH-000231/2026
  customer_id       BIGINT      NOT NULL REFERENCES customer(customer_id),
  device_id         BIGINT      NOT NULL REFERENCES device(device_id),
  center_id         INT         NOT NULL,
  issue_desc        TEXT        NOT NULL CHECK (char_length(issue_desc) BETWEEN 10 AND 2000),
  accessories       VARCHAR(60),                  -- SAC,TAI_NGHE,HOP,KHAC
  category_id       INT REFERENCES issue_category(category_id),
  priority          VARCHAR(10) NOT NULL CHECK (priority IN ('CAO','TRUNG_BINH','THAP')),
  status            VARCHAR(20) NOT NULL DEFAULT 'MOI' CHECK (status IN
                    ('MOI','DA_PHAN_CONG','DANG_XU_LY','CHO_LINH_KIEN','HOAN_TAT','DA_DONG','DA_HUY')),
  received_by       BIGINT      NOT NULL REFERENCES employee(employee_id),
  received_at       TIMESTAMP   NOT NULL,
  due_date          TIMESTAMP   NOT NULL,         -- QT-04
  closed_at         TIMESTAMP,
  is_warranty       BOOLEAN     NOT NULL,
  warranty_verified BOOLEAN     NOT NULL DEFAULT true, -- QT-05
  is_overdue        BOOLEAN     NOT NULL DEFAULT false,
  is_active         BOOLEAN     NOT NULL DEFAULT true  -- QT-13
);
CREATE INDEX IF NOT EXISTS idx_ticket_status_due ON ticket(status, due_date); -- NFR3
CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_device_open ON ticket(device_id)  -- QN-01
  WHERE status NOT IN ('DA_DONG','DA_HUY') AND is_active;