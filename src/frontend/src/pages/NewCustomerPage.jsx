import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { customersApi } from '../api/customers.api';
import { Field } from '../components/Field';

// Tạo hồ sơ khách mới, tùy chọn kèm thiết bị đầu tiên:
// POST /api/customers rồi POST /api/customers/{id}/devices.
export default function NewCustomerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ full_name: '', phone: params.get('phone') || '', email: '', address: '' });
  const [withDevice, setWithDevice] = useState(true);
  const [dev, setDev] = useState({ device_name: '', serial_no: '', purchase_date: '', warranty_months: '12' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null); // khách đã tạo nhưng thiết bị lỗi: chỉ lưu lại thiết bị

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setD = k => e => setDev(d => ({ ...d, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let customer = created;
      if (!customer) {
        customer = await customersApi.taoMoi({
          full_name: form.full_name,
          phone: form.phone,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
        });
        setCreated(customer);
      }
      if (withDevice) {
        await customersApi.themThietBi(customer.customer_id, {
          device_name: dev.device_name,
          serial_no: dev.serial_no,
          purchase_date: dev.purchase_date || null,
          warranty_months: Number(dev.warranty_months),
        });
      }
      navigate('/receive', { state: { phone: form.phone } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const f = error?.fields || {};
  const chung = error && !Object.keys(f).length;
  
  return (
    <section>
      <h1>Tạo khách hàng mới</h1>
      <form onSubmit={submit} className="card receive">
        <Field label="Họ tên" value={form.full_name} error={f.full_name} disabled={!!created} onChange={set('full_name')} />
        <Field label="Số điện thoại" inputMode="tel" value={form.phone} error={f.phone} disabled={!!created} onChange={set('phone')} />
        <div className="two">
          <Field label="Email (tùy chọn)" value={form.email} error={f.email} disabled={!!created} onChange={set('email')} />
          <Field label="Địa chỉ (tùy chọn)" value={form.address} error={f.address} disabled={!!created} onChange={set('address')} />
        </div>

        <Field inline label="Ghi nhận luôn thiết bị của khách" type="checkbox" checked={withDevice}
          onChange={e => setWithDevice(e.target.checked)} />

        {withDevice && (
          <fieldset>
            <legend>Thiết bị</legend>
            <Field label="Tên thiết bị" value={dev.device_name} error={f.device_name} onChange={setD('device_name')} />
            <Field label="Serial/IMEI" value={dev.serial_no} error={f.serial_no} onChange={setD('serial_no')} />
            <div className="two">
              <Field label="Ngày mua (tùy chọn)" type="date" value={dev.purchase_date} error={f.purchase_date} onChange={setD('purchase_date')} />
              <Field label="Số tháng bảo hành (1 đến 60)" type="number" min="1" max="60" value={dev.warranty_months}
                error={f.warranty_months} onChange={setD('warranty_months')} />
            </div>
          </fieldset>
        )}

        {created && error && (
          <p className="hint">Hồ sơ khách đã được tạo. Chỉ cần sửa thông tin thiết bị rồi bấm lưu lại.</p>
        )}
        {error?.code === 'PHONE_EXISTS' && (
          <p className="alert-error" role="alert">
            Số điện thoại này đã có hồ sơ{error.extra?.existing_customer?.full_name ? ` (${error.extra.existing_customer.full_name})` : ''}.{' '}
            <RouterLink to="/receive" state={{ phone: form.phone }}>Mở hồ sơ để tiếp nhận</RouterLink>
          </p>
        )}
        {error?.code === 'SERIAL_EXISTS' && (
          <p className="alert-error" role="alert">Serial/IMEI này đã được ghi nhận cho một thiết bị khác.</p>
        )}
        {chung && !['PHONE_EXISTS', 'SERIAL_EXISTS'].includes(error.code) && (
          <p className="alert-error" role="alert">{error.message}</p>
        )}

        <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
      </form>
    </section>
  );
}