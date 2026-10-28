import { request } from './client';

export const customersApi = {
  traCuuTheoSdt: phone => request(`/api/customers?phone=${encodeURIComponent(phone)}`),
};