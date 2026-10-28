import { ticketsApi } from '../api/tickets.api';
import { useApi } from './useApi';

export function useTickets(filters) {
  return useApi(() => ticketsApi.danhSach(filters), [JSON.stringify(filters)]);
}

export function useTicket(id) {
  return useApi(() => ticketsApi.chiTiet(id), [id]);
}