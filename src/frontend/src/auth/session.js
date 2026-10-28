// Lưu phiên đăng nhập trong localStorage (mức prototype). Hạn chế: mã JavaScript chèn vào trang (XSS) đọc được token;
// chấp nhận vì giao diện không hiển thị nội dung chưa thoát ký tự (React tự thoát).
// Cách an toàn hơn là cookie HttpOnly do máy chủ đặt, sẽ ghi vào nhật ký thay đổi thiết kế (TD).
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function saveSession({ access_token, user }) {
  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}