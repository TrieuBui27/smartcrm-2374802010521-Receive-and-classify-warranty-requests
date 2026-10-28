import { Navigate } from 'react-router-dom';
import { getToken } from '../auth/session';

// Chưa có token thì về trang đăng nhập (token sai hoặc hết hạn sẽ bị client.js xử lý khi nhận 401).
export function RequireAuth({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}