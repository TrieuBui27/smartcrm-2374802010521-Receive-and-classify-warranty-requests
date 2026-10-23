-- Bảng issue_category theo DDL BT1. Danh mục nhóm sự cố dùng cho FR5.
CREATE TABLE IF NOT EXISTS issue_category (
  category_id      SERIAL PRIMARY KEY,
  category_name    VARCHAR(60) NOT NULL UNIQUE,  -- MAN_HINH / PIN / SAC / PHAN_MEM / NUOC_VAO / KHAC
  keywords         VARCHAR(255),                 -- từ khóa cách nhau bằng dấu phẩy
  default_priority VARCHAR(10) NOT NULL CHECK (default_priority IN ('CAO','TRUNG_BINH','THAP')),
  is_active        BOOLEAN     NOT NULL DEFAULT true
);