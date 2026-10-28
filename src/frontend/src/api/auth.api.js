import { request } from './client';

export const authApi = {
  dangNhap: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};