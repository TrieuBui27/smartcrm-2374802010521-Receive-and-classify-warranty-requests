-- BUG-006 (QT-03): serial/IMEI không phân biệt hoa thường. Ràng buộc UNIQUE cũ chỉ chặn trùng đúng từng ký tự,
-- nên "abc123" và "ABC123" cùng được lưu. Chỉ mục này chặn cả hai, kể cả khi hai yêu cầu gửi cùng lúc.
CREATE UNIQUE INDEX IF NOT EXISTS ux_device_serial_upper ON device (UPPER(serial_no));