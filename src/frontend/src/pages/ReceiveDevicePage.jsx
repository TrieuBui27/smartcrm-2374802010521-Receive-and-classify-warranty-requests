import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { ticketsApi } from '../api/tickets.api';
import { useApi } from '../hooks/useApi';
import { Field } from '../components/Field';
import { PriorityBadge, priorityLabel } from '../components/Badge';

const ACCESSORIES = [['SAC', 'Sạc'], ['TAI_NGHE', 'Tai nghe'], ['HOP', 'Hộp'], ['KHAC', 'Khác']];
const PRIORITIES = ['CAO', 'TRUNG_BINH', 'THAP'];

export default function ReceiveDevicePage() {
  const navigate = useNavigate();
  const categories = useApi(() => ticketsApi.nhomSuCo(), []);

  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const [deviceId, setDeviceId] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('');
  const [accessories, setAccessories] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const traCuu = async e => {
    e.preventDefault();
    setBusy(true);
    setLookupError(null);
    setCustomer(null);
    try {
      const c = await customersApi.traCuuTheoSdt(phone);
      setCustomer(c);
      setDeviceId(c.devices.length === 1 ? String(c.devices[0].device_id) : '');
    } catch (err) {
      setLookupError(err); // INVALID_PHONE 400, CUSTOMER_NOT_FOUND 404 (UC3 luồng 6a)
    } finally {
      setBusy(false);
    }
  };

  const deXuat = async () => {
    setError(null);
    try {
      setSuggestion(await ticketsApi.deXuat(issueDesc));
    } catch (err) {
      setSuggestion(null);
      setError(err);
    }
  };

  const toggle = code => setAccessories(a => (a.includes(code) ? a.filter(x => x !== code) : [...a, code]));

  const tiepNhan = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const t = await ticketsApi.tiepNhan({
        customer_id: customer.customer_id,
        device_id: deviceId ? Number(deviceId) : undefined,
        issue_desc: issueDesc,
        category_id: categoryId ? Number(categoryId) : null,
        priority: priority || null,
        accessories,
      });
      navigate(`/tickets/${t.ticket_id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const f = error?.fields || {};
  const chung = error && !Object.keys(f).length; // lỗi không gắn với một ô: hiện ở cuối form

  return (
    <section>
      <h1>Tiếp nhận thiết bị</h1>

      <form onSubmit={traCuu} className="card">
        <Field label="Số điện thoại khách hàng" inputMode="tel" placeholder="Ví dụ 0901 234 567" value={phone}
          onChange={e => setPhone(e.target.value)} />
        {lookupError && (
          <p className="alert-error" role="alert">
            {lookupError.code === 'CUSTOMER_NOT_FOUND'
              ? 'Chưa có hồ sơ khách hàng với số này. Màn hình tạo hồ sơ mới chưa có trong bản này, hãy kiểm tra lại số điện thoại.'
              : lookupError.message}
          </p>
        )}
        <button type="submit" disabled={busy || !phone.trim()}>Tra cứu</button>
      </form>

      {customer && (
        <form onSubmit={tiepNhan} className="card receive">
          <h2>{customer.full_name} <small>{customer.phone}</small></h2>

          {customer.devices.length === 0 ? (
            <p className="alert-error">Khách hàng chưa có thiết bị nào được ghi nhận nên chưa thể lập phiếu.</p>
          ) : (
            <>
              <Field label="Thiết bị cần bảo hành" tag="select" value={deviceId} error={f.device_id}
                onChange={e => setDeviceId(e.target.value)}>
                <option value="">— Chọn thiết bị —</option>
                {customer.devices.map(d => (
                  <option key={d.device_id} value={d.device_id}>{d.device_name} · {d.serial_no}</option>
                ))}
              </Field>

              <Field label="Mô tả lỗi (10 đến 2000 ký tự)" tag="textarea" rows={3} value={issueDesc} error={f.issue_desc}
                onChange={e => { setIssueDesc(e.target.value); setSuggestion(null); }} />
              <button type="button" className="secondary" disabled={issueDesc.trim().length < 10} onClick={deXuat}>
                Đề xuất nhóm sự cố
              </button>
              {suggestion && (
                <p className="hint">Đề xuất: nhóm <strong>{suggestion.category_name}</strong>, ưu tiên <PriorityBadge priority={suggestion.priority} />.
                  Để trống hai ô dưới thì hệ thống dùng đề xuất này.</p>
              )}

              <div className="two">
                <Field label="Nhóm sự cố (tùy chọn)" tag="select" value={categoryId} error={f.category_id}
                  onChange={e => setCategoryId(e.target.value)}>
                  <option value="">Theo đề xuất</option>
                  {(categories.data || []).map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </Field>
                <Field label="Mức ưu tiên (tùy chọn)" tag="select" value={priority} error={f.priority}
                  onChange={e => setPriority(e.target.value)}>
                  <option value="">Theo đề xuất</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p)}</option>)}
                </Field>
              </div>

              <fieldset>
                <legend>Phụ kiện kèm theo</legend>
                {ACCESSORIES.map(([code, label]) => (
                  <Field key={code} inline label={label} type="checkbox" checked={accessories.includes(code)}
                    onChange={() => toggle(code)} />
                ))}
              </fieldset>

              {error?.code === 'DEVICE_HAS_OPEN_TICKET' && (
                <p className="alert-error" role="alert">
                  Thiết bị này đang có phiếu <strong>{error.extra.open_ticket_code}</strong> chưa đóng nên chưa thể lập phiếu mới.
                </p>
              )}
              {chung && error.code !== 'DEVICE_HAS_OPEN_TICKET' && <p className="alert-error" role="alert">{error.message}</p>}

              <button type="submit" disabled={busy || !deviceId}>Lập phiếu bảo hành</button>
            </>
          )}
        </form>
      )}
    </section>
  );
}