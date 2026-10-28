import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ticketsApi } from '../api/tickets.api';
import { useTicket } from '../hooks/useTickets';
import { DataState } from '../components/DataState';
import { Field } from '../components/Field';
import { StatusBadge, PriorityBadge, statusLabel } from '../components/Badge';

const fmt = iso => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const ACCESSORY = { SAC: 'Sạc', TAI_NGHE: 'Tai nghe', HOP: 'Hộp', KHAC: 'Khác' };

export default function TicketDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useTicket(id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const doiTrangThai = async toStatus => {
    setBusy(true);
    setActionError(null);
    try {
      await ticketsApi.doiTrangThai(id, toStatus, note.trim());
      setNote('');
      reload();
    } catch (err) {
      setActionError(err); // 422 INVALID_TRANSITION, 403 FORBIDDEN... backend đã có thông báo tiếng Việt
      reload();            // phiếu có thể đã được người khác đổi: tải lại để thấy trạng thái thật
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <p><RouterLink to="/tickets">← Danh sách phiếu</RouterLink></p>
      <DataState loading={loading} error={error} data={data} onRetry={reload}
        empty={{ message: 'Không tìm thấy phiếu bảo hành.' }}>
        {t => (
          <>
            <h1>Phiếu {t.ticket_code} <StatusBadge status={t.status} /></h1>
            <dl className="detail card">
              <div><dt>Khách hàng</dt><dd>{t.customer_name} · {t.customer_phone}</dd></div>
              <div><dt>Thiết bị</dt><dd>{t.device_name}{t.serial_no && ` (${t.serial_no})`}</dd></div>
              <div><dt>Nhóm sự cố</dt><dd>{t.category_name ?? '—'} · <PriorityBadge priority={t.priority} /></dd></div>
              <div><dt>Mô tả lỗi</dt><dd>{t.issue_desc}</dd></div>
              <div><dt>Phụ kiện kèm theo</dt><dd>{t.accessories?.length ? t.accessories.map(a => ACCESSORY[a] || a).join(', ') : 'Không'}</dd></div>
              <div><dt>Bảo hành</dt><dd>{t.is_warranty ? 'Còn bảo hành' : 'Hết bảo hành'}{!t.warranty_verified && ' (chưa xác minh ngày mua)'}</dd></div>
              <div><dt>Tiếp nhận lúc</dt><dd>{fmt(t.received_at)}</dd></div>
              <div><dt>Hạn cam kết</dt><dd>{fmt(t.due_date)}{t.is_overdue && <strong className="late"> · Quá hạn</strong>}</dd></div>
              {t.closed_at && <div><dt>Đóng lúc</dt><dd>{fmt(t.closed_at)}</dd></div>}
            </dl>

            {t.allowed_transitions.length > 0 && (
              <div className="card actions">
                <h2>Chuyển trạng thái</h2>
                <Field label="Ghi chú (không bắt buộc)" tag="textarea" rows={2} maxLength={500} value={note}
                  onChange={e => setNote(e.target.value)} />
                {actionError && <p className="alert-error" role="alert">{actionError.message}</p>}
                <div className="buttons">
                  {t.allowed_transitions.map(s => (
                    <button key={s} type="button" disabled={busy} onClick={() => doiTrangThai(s)}>
                      Chuyển sang: {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2>Nhật ký trạng thái</h2>
            <ol className="log">
              {t.status_log.map((l, i) => (
                <li key={i}>
                  <strong>{l.from_status ? `${statusLabel(l.from_status)} → ` : ''}{statusLabel(l.to_status)}</strong>
                  <span> · {fmt(l.changed_at)}{l.changed_by_name && ` · ${l.changed_by_name}`}</span>
                  {l.note && <small>{l.note}</small>}
                </li>
              ))}
            </ol>
          </>
        )}
      </DataState>
    </section>
  );
}