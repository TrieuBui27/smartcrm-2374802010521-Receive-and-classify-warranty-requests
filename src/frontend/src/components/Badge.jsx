const STATUS = {
  MOI: ['Mới', 'blue'], DA_PHAN_CONG: ['Đã phân công', 'indigo'], DANG_XU_LY: ['Đang xử lý', 'amber'],
  CHO_LINH_KIEN: ['Chờ linh kiện', 'orange'], HOAN_TAT: ['Hoàn tất', 'green'], DA_DONG: ['Đã đóng', 'gray'], DA_HUY: ['Đã hủy', 'gray'],
};
const PRIORITY = { CAO: ['Cao', 'red'], TRUNG_BINH: ['Trung bình', 'amber'], THAP: ['Thấp', 'gray'] };

export const statusLabel = s => (STATUS[s] || [s])[0];
export const priorityLabel = p => (PRIORITY[p] || [p])[0];

export function StatusBadge({ status }) {
  const [label, color] = STATUS[status] || [status, 'gray'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

export function PriorityBadge({ priority }) {
  const [label, color] = PRIORITY[priority] || [priority, 'gray'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}