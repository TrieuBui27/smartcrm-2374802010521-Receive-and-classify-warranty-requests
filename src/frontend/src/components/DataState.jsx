// Ba trạng thái dùng lại ở mọi màn hình: đang tải, lỗi (có nút thử lại), rỗng (thông báo riêng và hành động riêng).
export function DataState({ loading, error, data, isEmpty, empty, onRetry, children }) {
  if (loading) return <div className="state state-loading" role="status">Đang tải dữ liệu…</div>;

  if (error) return (
    <div className="state state-error" role="alert">
      <p>{error.message}</p>
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