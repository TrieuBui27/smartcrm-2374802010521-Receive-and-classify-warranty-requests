import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { DataState } from '../components/DataState';
import { Pagination } from '../components/Pagination';
import { StatusBadge, PriorityBadge, statusLabel } from '../components/Badge';
import { getUser } from '../auth/session';
import { Field } from '../components/Field';

const STATUSES = ['MOI', 'DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN', 'HOAN_TAT', 'DA_DONG', 'DA_HUY'];
const SIZE = 10;
const fmt = iso => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

export default function TicketListPage() {
  const [filters, setFilters] = useState({ page: 1, size: SIZE });
  const { data, loading, error, reload } = useTickets(filters);
  const loc = filters.status || filters.overdue;
  const set = patch => setFilters({ ...filters, ...patch, page: 1 });
  const nhanVien = getUser()?.role === 'NHAN_VIEN_TIEP_NHAN';

  return (
    <section>
      <h1>Danh sách phiếu bảo hành</h1>
      <div className="filters">
        <Field label="Trạng thái" tag="select" value={filters.status || ''} onChange={e => set({ status: e.target.value || undefined })}>
          <option value="">Tất cả</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </Field>
        <Field inline label="Chỉ phiếu quá hạn" type="checkbox" checked={!!filters.overdue}
          onChange={e => set({ overdue: e.target.checked || undefined })} />
      </div>

      <DataState
        loading={loading} error={error} data={data} onRetry={reload}
        isEmpty={d => !d || d.items.length === 0}
        empty={loc
          ? { message: 'Không có phiếu nào khớp bộ lọc hiện tại.',
              action: <button type="button" onClick={() => setFilters({ page: 1, size: SIZE })}>Xóa bộ lọc</button> }
          : { message: 'Chưa có phiếu bảo hành nào.',
              action: nhanVien ? <RouterLink className="button" to="/receive">Tiếp nhận thiết bị</RouterLink> : null }}>
        {d => (
          <>
            <table className="tickets">
              <thead>
                <tr><th>Mã phiếu</th><th>Khách hàng</th><th>Thiết bị</th><th>Nhóm sự cố</th><th>Ưu tiên</th><th>Trạng thái</th><th>Hạn cam kết</th></tr>
              </thead>
              <tbody>
                {d.items.map(t => (
                  <tr key={t.ticket_id} className={t.is_overdue ? 'overdue' : ''}>
                    <td data-label="Mã phiếu"><RouterLink to={`/tickets/${t.ticket_id}`}>{t.ticket_code}</RouterLink></td>
                    <td data-label="Khách hàng">{t.customer_name}<small>{t.customer_phone}</small></td>
                    <td data-label="Thiết bị">{t.device_name}</td>
                    <td data-label="Nhóm sự cố">{t.category_name ?? '—'}</td>
                    <td data-label="Ưu tiên"><PriorityBadge priority={t.priority} /></td>
                    <td data-label="Trạng thái"><StatusBadge status={t.status} /></td>
                    <td data-label="Hạn cam kết">{fmt(t.due_date)}{t.is_overdue && <strong className="late"> · Quá hạn</strong>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={d.page} size={d.size} total={d.total} onChange={page => setFilters({ ...filters, page })} />
          </>
        )}
      </DataState>
    </section>
  );
}