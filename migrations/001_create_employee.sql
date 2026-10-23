-- Bảng employee theo DDL BT1 (Mục 4.2). Vai trò và trung tâm dùng cho QT-14.
CREATE TABLE IF NOT EXISTS employee (
  employee_id BIGSERIAL PRIMARY KEY,
  full_name   VARCHAR(120) NOT NULL,
  role        VARCHAR(30)  NOT NULL CHECK (role IN ('NHAN_VIEN_TIEP_NHAN','QUAN_LY_TRUNG_TAM')),
  center_id   INT          NOT NULL, -- danh mục trung tâm nằm ngoài phạm vi ERD
  is_active   BOOLEAN      NOT NULL DEFAULT true
);