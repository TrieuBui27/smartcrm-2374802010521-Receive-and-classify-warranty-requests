//Lớp nghiệp vụ của phiếu bảo hành (UC3, UC7): QT-04, QT-05, QT-06, QT-14, QN-01. Không biết gì về HTTP.
const AppError = require('../errors/AppError');
const rules = require('./ticket.rules');
const { toTicketView, toIsoVn } = require('./ticket.contract');

/**
 * Tạo TicketService gắn với một repository (thật hoặc giả trong kiểm thử).
 * @param {object} repo Repository phiếu: findDeviceById, findOpenTicketByDevice, findActiveCategories,
 *   createWithLog, findById, updateStatusIfCurrent (xem ticket.repository.js).
 * @param {{now?: () => Date}} [options] now: đồng hồ, kiểm thử truyền vào để cố định thời điểm tiếp nhận.
 */
function createTicketService(repo, { now = () => new Date() } = {}) {
  async function openTicketConflict(deviceId) {
    const open = await repo.findOpenTicketByDevice(deviceId);
    return new AppError('DEVICE_HAS_OPEN_TICKET', 'Thiết bị đang có phiếu bảo hành chưa đóng',
      { open_ticket_code: open ? open.ticket_code : null });
  }

  /**
   * Tạo phiếu bảo hành (UC3) kèm dòng nhật ký trạng thái đầu tiên.
   * @param {{customer_id:number, device_id:number, issue_desc:string, center_id?:number,
   *   category_id?:number|null, priority?:string|null, accessories?:string[]}} data Đã qua validator.
   * @param {{employee_id:number, role:string, center_id:number}} user Người đang đăng nhập.
   * @returns {Promise} Dòng phiếu vừa lưu (chưa đổi sang hợp đồng hiển thị).
   * @throws {AppError} NOT_FOUND khi thiết bị không tồn tại; VALIDATION_FAILED khi thiết bị không thuộc
   *   khách hàng (QT-03) hoặc nhóm sự cố không hợp lệ; FORBIDDEN khi tạo cho trung tâm khác (QT-14);
   *   DEVICE_HAS_OPEN_TICKET khi thiết bị đang có phiếu chưa đóng (6a, 8a).
   */
  async function create(data, user) {
    const device = await repo.findDeviceById(data.device_id);
    if (!device) throw new AppError('NOT_FOUND', 'Không tìm thấy thiết bị');
    if (Number(device.customer_id) !== Number(data.customer_id)) {
      throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ',
        { fields: { device_id: 'Thiết bị không thuộc về khách hàng này' } });
    }
    const centerId = data.center_id ?? user.center_id;
    if (Number(centerId) !== Number(user.center_id)) throw new AppError('FORBIDDEN', 'Không được tạo phiếu cho trung tâm khác');

    // UC3 6a: kiểm tra trước để báo lỗi rõ ràng kèm mã phiếu cũ.
    if (await repo.findOpenTicketByDevice(device.device_id)) throw await openTicketConflict(device.device_id);

    const receivedAt = now();
    const categories = await repo.findActiveCategories();
    const suggestion = rules.suggestCategory(data.issue_desc, categories);
    let categoryId = suggestion ? suggestion.category_id : null;
    let priority = suggestion ? suggestion.priority : 'THAP';
    // UC3 bước 7: nhân viên được sửa đề xuất; chọn nhóm khác thì lấy mức mặc định của nhóm đó.
    if (data.category_id != null) {
      const chosen = categories.find(c => c.category_id === Number(data.category_id));
      if (!chosen) throw new AppError('VALIDATION_FAILED', 'Dữ liệu không hợp lệ', { fields: { category_id: 'Nhóm sự cố không hợp lệ' } });
      categoryId = chosen.category_id;
      priority = chosen.default_priority;
    }
    if (data.priority) priority = data.priority;

    const ticket = await repo.createWithLog({
      customer_id: Number(data.customer_id),
      device_id: device.device_id,
      center_id: Number(centerId),
      issue_desc: data.issue_desc.trim(),
      accessories: data.accessories && data.accessories.length ? data.accessories.join(',') : null,
      category_id: categoryId,
      priority,
      received_by: user.employee_id,
      received_at: receivedAt,
      due_date: rules.computeDueDate(receivedAt, priority), // QT-04: không nhận hạn do người dùng gửi lên
      ...rules.checkWarranty(device.purchase_date, device.warranty_months, receivedAt),
    }, user.employee_id);
    // UC3 8a: một yêu cầu khác vừa lưu phiếu cho cùng thiết bị, chỉ mục ux_ticket_device_open từ chối.
    if (!ticket) throw await openTicketConflict(device.device_id);
    return ticket;
  }

  /**
   * Chuyển trạng thái phiếu (UC7) và ghi nhật ký trong cùng một giao dịch.
   * @param {number|string} id Mã phiếu (ticket_id).
   * @param {{to_status:string, note?:string}} input Trạng thái đích và ghi chú.
   * @param {{employee_id:number, role:string, center_id:number}} user Người thực hiện.
   * @returns {Promise<{ticket: object, log: object}>} Phiếu sau khi đổi và dòng nhật ký vừa ghi.
   * @throws {AppError} NOT_FOUND; FORBIDDEN khi phiếu thuộc trung tâm khác (1a) hoặc vai trò không được
   *   chuyển tới trạng thái đó (3b); INVALID_TRANSITION khi sai vòng đời (3a) hoặc bị người khác đổi trước (4b).
   */
  async function changeStatus(id, { to_status, note }, user) {
    const ticket = await repo.findById(id);
    if (!ticket) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
    // QT-14: không cho biết phiếu trung tâm khác có tồn tại hay không ngoài mã 403.
    if (Number(ticket.center_id) !== Number(user.center_id)) throw new AppError('FORBIDDEN', 'Phiếu thuộc trung tâm khác');
    if (!rules.canTransition(ticket.status, to_status)) {
      throw new AppError('INVALID_TRANSITION', `Không thể chuyển từ ${ticket.status} sang ${to_status}`);
    }
    if (!rules.roleCanMoveTo(user.role, to_status)) {
      throw new AppError('FORBIDDEN', 'Vai trò của bạn không được chuyển phiếu sang trạng thái này');
    }
    // UC7 4b: chỉ cập nhật khi trạng thái trong CSDL vẫn là trạng thái vừa đọc.
    const result = await repo.updateStatusIfCurrent(ticket.ticket_id, ticket.status, to_status, user.employee_id, note || null);
    if (!result) throw new AppError('INVALID_TRANSITION', 'Phiếu vừa được người khác cập nhật, vui lòng tải lại');
    return result;
  }

  /**
   * Danh sách phiếu của trung tâm người xem (QT-14), sắp theo hạn cam kết tăng dần.
   * @param {{page:number, size:number, status?:string, overdue?:boolean, center_id?:number}} query Đã qua validator.
   * @param {{role:string, center_id:number}} user Người xem.
   * @returns {Promise} { items, page, size, total }; mỗi item đúng hợp đồng ticket.contract.js.
   * @throws {AppError} FORBIDDEN khi xin xem trung tâm khác.
   */
  async function list(query, user) {
    if (query.center_id !== undefined && Number(query.center_id) !== Number(user.center_id)) {
      throw new AppError('FORBIDDEN', 'Không được xem phiếu của trung tâm khác');
    }
    const { rows, total } = await repo.list({
      center_id: user.center_id, status: query.status, overdue: query.overdue, page: query.page, size: query.size,
    });
    const at = now();
    return { items: rows.map(r => toTicketView(r, user, at)), page: query.page, size: query.size, total };
  }

  /**
   * Chi tiết một phiếu kèm nhật ký trạng thái theo thứ tự thời gian.
   * @returns {Promise} Phiếu đúng hợp đồng cộng status_log.
   * @throws {AppError} NOT_FOUND; FORBIDDEN khi phiếu thuộc trung tâm khác (QT-14).
   */
  async function getView(id, user) {
    const row = await repo.findViewById(id);
    if (!row) throw new AppError('NOT_FOUND', 'Không tìm thấy phiếu bảo hành');
    if (Number(row.center_id) !== Number(user.center_id)) throw new AppError('FORBIDDEN', 'Phiếu thuộc trung tâm khác');
    const log = await repo.findLog(row.ticket_id);
    return {
      ...toTicketView(row, user, now()),
      status_log: log.map(l => ({
        from_status: l.from_status ?? null, to_status: l.to_status, changed_at: toIsoVn(l.changed_at),
        changed_by_name: l.changed_by_name ?? null, note: l.note ?? null,
      })),
    };
  }

  return { create, changeStatus, list, getView };
}

module.exports = { createTicketService };