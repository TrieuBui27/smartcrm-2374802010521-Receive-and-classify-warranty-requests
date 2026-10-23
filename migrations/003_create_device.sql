-- Bảng device theo DDL BT1. serial_no không trùng (QT-03).
CREATE TABLE IF NOT EXISTS device (
  device_id       BIGSERIAL PRIMARY KEY,
  customer_id     BIGINT      NOT NULL REFERENCES customer(customer_id),
  device_name     VARCHAR(120) NOT NULL,
  serial_no       VARCHAR(50) NOT NULL UNIQUE,
  purchase_date   DATE,                         -- NULL = chưa biết ngày mua
  warranty_months SMALLINT    NOT NULL DEFAULT 12
);