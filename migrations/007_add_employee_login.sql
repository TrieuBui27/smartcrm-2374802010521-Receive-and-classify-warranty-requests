-- Đăng nhập (buổi 9–10): tên đăng nhập và mật khẩu đã băm bcrypt. Mật khẩu gốc không bao giờ được lưu.
-- Hai cột để NULL được vì nhân viên có sẵn từ buổi 8 chưa có tài khoản; db:seed bổ sung tài khoản mẫu.
ALTER TABLE employee ADD COLUMN IF NOT EXISTS username      VARCHAR(50);
ALTER TABLE employee ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_username ON employee(username);