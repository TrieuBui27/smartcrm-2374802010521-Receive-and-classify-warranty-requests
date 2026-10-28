import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getToken, saveSession } from '../auth/session';
import { Field } from '../components/Field';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (getToken()) return <Navigate to="/tickets" replace />;

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      saveSession(await authApi.dangNhap(form.username, form.password));
      navigate('/tickets');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form onSubmit={submit} className="card">
        <h1>Đăng nhập</h1>
        <Field label="Tên đăng nhập" autoComplete="username" value={form.username} error={error?.fields?.username}
          onChange={e => setForm({ ...form, username: e.target.value })} />
        <Field label="Mật khẩu" type="password" autoComplete="current-password" value={form.password} error={error?.fields?.password}
          onChange={e => setForm({ ...form, password: e.target.value })} />
        {error && !error.fields?.username && !error.fields?.password && <p className="alert-error" role="alert">{error.message}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </main>
  );
}