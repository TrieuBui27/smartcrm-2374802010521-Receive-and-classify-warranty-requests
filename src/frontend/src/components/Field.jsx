import { createElement } from 'react';

// Ô nhập có nhãn và dòng lỗi theo từng ô (error lấy từ fields của backend). Dùng lại ở đăng nhập, bộ lọc và biểu mẫu tiếp nhận.
// tag: 'input' (mặc định), 'select' hoặc 'textarea'. inline: nhãn đặt sau ô (dùng cho checkbox).
export function Field({ label, error, tag = 'input', inline = false, children, ...props }) {
  const control = createElement(tag, props, children);
  return inline ? (
    <label className="check">{control}{label}</label>
  ) : (
    <label>
      {label}
      {control}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}