import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../auth/session';

const ROLE = { NHAN_VIEN_TIEP_NHAN: 'Nhân viên tiếp nhận', QUAN_LY_TRUNG_TAM: 'Quản lý trung tâm' };

export function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const dangXuat = () => { clearSession(); navigate('/login'); };

  return (
    <>
      <header className="topbar">
        <RouterLink to="/tickets" className="brand">Smart CRM · Bảo hành</RouterLink>
        <nav>
          <RouterLink to="/tickets">Danh sách phiếu</RouterLink>
          {user?.role === 'NHAN_VIEN_TIEP_NHAN' && <RouterLink to="/receive">Tiếp nhận thiết bị</RouterLink>}
        </nav>
        <div className="who">
          <span>{user?.full_name} · {ROLE[user?.role]} · TT{user?.center_id}</span>
          <button type="button" onClick={dangXuat}>Đăng xuất</button>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}