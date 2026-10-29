// Ba trạng thái dùng lại ở mọi màn hình: đang tải, lỗi (có nút thử lại), rỗng (thông báo riêng và hành động riêng).
export function DataState({ loading, error, data, isEmpty, empty, onRetry, children }) {
  if (loading) return <div className="state state-loading" role="status">Đang tải dữ liệu…</div>;

  if (error) return (
    <div className="state state-error" role="alert">
      <p>{error.message}</p>
      {/* Lỗi 500/503 có mã tra cứu: người dùng báo mã này, người vận hành tìm đúng dòng log theo requestId. */}
      {error.extra?.request_id && <p className="state-ref">Mã tra cứu: <code>{error.extra.request_id}</code></p>}
      {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
    </div>
  );

  const rong = isEmpty ? isEmpty(data) : !data || (Array.isArray(data) && data.length === 0);
  if (rong) return (
    <div className="state state-empty">
      <p>{empty?.message || 'Chưa có dữ liệu nào.'}</p>
      {empty?.action}
    </div>
  );

  return children(data);
}