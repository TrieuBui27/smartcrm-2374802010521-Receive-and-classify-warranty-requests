// Lớp truy cập dữ liệu của phiếu bảo hành: chỉ chứa SQL tham số hóa, không chứa quy tắc nghiệp vụ.
// Các hàm trả về đúng những gì TicketService cần (xem tests/ticket.service.test.js).
const pool = require('../db/pool');

const TICKET_COLS = `ticket_id, ticket_code, customer_id, device_id, center_id, issue_desc, accessories,
  category_id, priority, status, received_by, received_at, due_date, closed_at,
  is_warranty, warranty_verified, is_overdue`;
const OPEN_INDEX = 'ux_ticket_device_open';

// Cột TIMESTAMP lưu giờ Việt Nam (xem db/pool.js): đổi Date sang chuỗi giờ Việt Nam trước khi gửi vào.
const toDbTime = d => new Date(new Date(d).getTime() + 7 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');

async function findDeviceById(id) {
  const { rows } = await pool.query(
    `SELECT device_id, customer_id, device_name, serial_no, purchase_date::text AS purchase_date, warranty_months
       FROM device WHERE device_id = $1`, [id]);
  return rows[0] || null;
}

// QN-01: phiếu chưa đóng = khác Đã đóng, Đã hủy và còn dùng (QT-13).
async function findOpenTicketByDevice(deviceId) {
  const { rows } = await pool.query(
    `SELECT ticket_id, ticket_code, status FROM ticket
      WHERE device_id = $1 AND is_active AND status NOT IN ('DA_DONG','DA_HUY')`, [deviceId]);
  return rows[0] || null;
}

async function findActiveCategories() {
  const { rows } = await pool.query(
    `SELECT category_id, category_name, keywords, default_priority
       FROM issue_category WHERE is_active ORDER BY category_id`);
  return rows;
}

/**
 * Lưu phiếu và dòng nhật ký đầu tiên trong MỘT giao dịch (NFR4): hoặc có cả hai, hoặc không có gì.
 * Mã phiếu BH-nnnnnn/năm lấy từ chính ticket_id nên luôn duy nhất.
 * @returns {Promise} Phiếu vừa lưu, hoặc null khi chỉ mục ux_ticket_device_open từ chối vì thiết bị
 *   đã có phiếu chưa đóng (UC3 luồng 8a). Lỗi khác (mất kết nối, vi phạm ràng buộc khác) được ném ra (8b).
 */
async function createWithLog(t, changedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [{ id }] } = await client.query(
      "SELECT nextval(pg_get_serial_sequence('ticket','ticket_id')) AS id");
    const year = toDbTime(t.received_at).slice(0, 4); // năm theo giờ Việt Nam
    const code = `BH-${String(id).padStart(6, '0')}/${year}`;
    const { rows } = await client.query(
      `INSERT INTO ticket (ticket_id, ticket_code, customer_id, device_id, center_id, issue_desc, accessories,
                           category_id, priority, received_by, received_at, due_date, is_warranty, warranty_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING ${TICKET_COLS}`,
      [id, code, t.customer_id, t.device_id, t.center_id, t.issue_desc, t.accessories,
       t.category_id, t.priority, t.received_by, toDbTime(t.received_at), toDbTime(t.due_date),
       t.is_warranty, t.warranty_verified]);
    await client.query(
      `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
       VALUES ($1, NULL, 'MOI', $2, 'Tiếp nhận phiếu')`, [id, changedBy]);
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint === OPEN_INDEX) return null;
    throw err;
  } finally {
    client.release();
  }
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${TICKET_COLS} FROM ticket WHERE ticket_id = $1 AND is_active`, [id]);
  return rows[0] || null;
}

/**
 * Đổi trạng thái và ghi nhật ký trong MỘT giao dịch. Câu UPDATE có điều kiện status = trạng thái đã đọc,
 * nên khi hai người đổi cùng lúc chỉ một câu cập nhật được dòng (UC7 luồng 4b).
 * @returns {Promise} { ticket, log }, hoặc null khi trạng thái hiện tại không còn là `from`.
 */
async function updateStatusIfCurrent(id, from, to, changedBy, note) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE ticket
          SET status = $3,
              closed_at = CASE WHEN $3::varchar = 'DA_DONG' THEN now() ELSE closed_at END
        WHERE ticket_id = $1 AND status = $2 AND is_active
        RETURNING ${TICKET_COLS}`, [id, from, to]);
    if (!rows.length) { await client.query('ROLLBACK'); return null; }
    const { rows: [log] } = await client.query(
      `INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING log_id, ticket_id, from_status, to_status, changed_at, changed_by, note`,
      [id, from, to, changedBy, note]);
    await client.query('COMMIT');
    return { ticket: rows[0], log };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Phiếu nối khách, thiết bị, nhóm sự cố: đúng các trường mà toTicketView (ticket.contract.js) cần.
// LEFT JOIN để phiếu vẫn hiện khi hồ sơ khách hoặc thiết bị không đọc được ("(không rõ)").
const VIEW_SELECT = `SELECT t.ticket_id, t.ticket_code, t.status, t.priority, ic.category_name, t.issue_desc, t.accessories,
       c.full_name AS customer_name, c.phone AS customer_phone, d.device_name, d.serial_no, t.center_id,
       t.received_at, t.due_date, t.closed_at, t.is_warranty, t.warranty_verified
  FROM ticket t
  LEFT JOIN customer c ON c.customer_id = t.customer_id
  LEFT JOIN device d ON d.device_id = t.device_id
  LEFT JOIN issue_category ic ON ic.category_id = t.category_id`;
const NOT_DONE = "t.status NOT IN ('HOAN_TAT','DA_DONG','DA_HUY')";

/**
 * Danh sách phiếu của một trung tâm, lọc theo trạng thái và quá hạn, phân trang, sắp theo hạn cam kết tăng dần.
 * "Quá hạn" tính lúc đọc: chưa hoàn tất và due_date đã qua now() (giờ Việt Nam, xem db/pool.js).
 * @returns {Promise} { rows, total }; total là tổng số phiếu khớp bộ lọc, không phụ thuộc phân trang.
 */
async function list({ center_id, status, overdue, page, size }) {
  const where = ['t.is_active', 't.center_id = $1'];
  const params = [center_id];
  if (status) { params.push(status); where.push(`t.status = $${params.length}`); }
  if (overdue === true) where.push(`${NOT_DONE} AND t.due_date < now()`);
  if (overdue === false) where.push(`NOT (${NOT_DONE} AND t.due_date < now())`);
  const cond = where.join(' AND ');
  const { rows: [{ n }] } = await pool.query(`SELECT COUNT(*)::int AS n FROM ticket t WHERE ${cond}`, params);
  const { rows } = await pool.query(
    `${VIEW_SELECT} WHERE ${cond} ORDER BY t.due_date ASC, t.ticket_id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, size, (page - 1) * size]);
  return { rows, total: n };
}

async function findViewById(id) {
  const { rows } = await pool.query(`${VIEW_SELECT} WHERE t.ticket_id = $1 AND t.is_active`, [id]);
  return rows[0] || null;
}

async function findLog(ticketId) {
  const { rows } = await pool.query(
    `SELECT l.from_status, l.to_status, l.changed_at, e.full_name AS changed_by_name, l.note
       FROM ticket_status_log l LEFT JOIN employee e ON e.employee_id = l.changed_by
      WHERE l.ticket_id = $1 ORDER BY l.changed_at ASC, l.log_id ASC`, [ticketId]);
  return rows;
}

module.exports = {
  findDeviceById, findOpenTicketByDevice, findActiveCategories, createWithLog, findById, updateStatusIfCurrent,
  list, findViewById, findLog,
};