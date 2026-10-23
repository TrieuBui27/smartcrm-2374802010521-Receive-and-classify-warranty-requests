-- Bảng customer theo DDL BT1. phone đã chuẩn hóa 10 số (QT-02), không trùng (QT-01).
CREATE TABLE IF NOT EXISTS customer (
  customer_id BIGSERIAL PRIMARY KEY,
  full_name   VARCHAR(120) NOT NULL,
  phone       VARCHAR(20)  NOT NULL UNIQUE CHECK (phone ~ '^0[0-9]{9}$'),
  email       VARCHAR(120),
  address     VARCHAR(255),
  is_active   BOOLEAN      NOT NULL DEFAULT true, -- QT-13: không xóa vật lý
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);