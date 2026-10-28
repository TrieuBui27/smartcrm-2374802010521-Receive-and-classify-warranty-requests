export function Pagination({ page, size, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</button>
      <span>Trang {page} / {pages} ({total} phiếu)</span>
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau</button>
    </nav>
  );
}