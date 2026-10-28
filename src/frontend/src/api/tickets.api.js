// Mỗi nghiệp vụ một hàm, tên hàm nói rõ nó làm gì. Tên trường giữ snake_case đúng hợp đồng API.
import { request } from './client';

export const ticketsApi = {
  danhSach: ({ page = 1, size = 10, status, overdue } = {}) => {
    const q = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) q.set('status', status);
    if (overdue) q.set('overdue', 'true');
    return request(`/api/tickets?${q}`);
  },
  chiTiet: id => request(`/api/tickets/${id}`),
  tiepNhan: payload => request('/api/tickets', { method: 'POST', body: JSON.stringify(payload) }),
  doiTrangThai: (id, to_status, note) =>
    request(`/api/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ to_status, note: note || null }) }),
  deXuat: issue_desc => request('/api/tickets/suggestion', { method: 'POST', body: JSON.stringify({ issue_desc }) }),
  nhomSuCo: () => request('/api/issue-categories'),
};