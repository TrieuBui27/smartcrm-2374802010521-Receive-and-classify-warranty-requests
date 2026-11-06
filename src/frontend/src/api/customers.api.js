import { request } from './client';

export const customersApi = {
  traCuuTheoSdt: phone => request(`/api/customers?phone=${encodeURIComponent(phone)}`),
  taoMoi: payload => request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  themThietBi: (customerId, payload) =>
    request(`/api/customers/${customerId}/devices`, { method: 'POST', body: JSON.stringify(payload) }),
};