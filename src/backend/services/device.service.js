// Lớp nghiệp vụ thiết bị (UC2): QT-03 serial/IMEI không trùng; không xóa thiết bị đã có phiếu để giữ lịch sử
// bảo hành. Không biết gì về HTTP (req, res, mã trạng thái).
const AppError = require('../errors/AppError');

// Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (dùng kiểm tra ngày mua không sau hôm nay).
const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

const notFound = () => new AppError('NOT_FOUND', 'Không tìm thấy thiết bị');
const serialExists = existing => new AppError('SERIAL_EXISTS', 'Serial/IMEI đã thuộc một thiết bị khác (QT-03)',
  { existing_device_id: existing.device_id });

/**
 * @param {object} repo device.repository hoặc repository giả trong kiểm thử.
 * @param {{today?: function}} options today() trả ngày hôm nay YYYY-MM-DD; kiểm thử truyền ngày cố định.
 */
function createDeviceService(repo, { today = todayVN } = {}) {
  async function create(customerId, data) {
    if (!(await repo.customerExists(customerId))) throw new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    const device = {
      device_name: data.device_name.trim(),
      serial_no: data.serial_no.trim(),
      purchase_date: data.purchase_date ?? null,
      warranty_months: data.warranty_months ?? 12,
    };
    const existing = await repo.findBySerial(device.serial_no);
    if (existing) throw serialExists(existing);
    const created = await repo.create(customerId, device);
    // null: một yêu cầu khác vừa ghi cùng serial giữa lúc kiểm tra và lúc ghi.
    if (!created) throw serialExists(await repo.findBySerial(device.serial_no));
    return created;
  }

  async function getById(id) {
    const device = await repo.findById(id);
    if (!device) throw notFound();
    return device;
  }

  async function update(id, data) {
    const fields = {};
    for (const k of ['purchase_date', 'warranty_months']) if (data[k] !== undefined) fields[k] = data[k];
    if (data.device_name !== undefined) fields.device_name = data.device_name.trim();
    if (data.serial_no !== undefined) {
      fields.serial_no = data.serial_no.trim();
      const other = await repo.findBySerial(fields.serial_no);
      if (other && String(other.device_id) !== String(id)) throw serialExists(other);
    }
    const updated = await repo.update(id, fields);
    if (!updated) throw notFound();
    return updated;
  }

  async function remove(id) {
    if (!(await repo.findById(id))) throw notFound();
    if ((await repo.countTickets(id)) > 0) {
      throw new AppError('DEVICE_HAS_TICKETS', 'Thiết bị đã có phiếu bảo hành nên không xóa được (giữ lịch sử bảo hành)');
    }
    if (!(await repo.remove(id))) throw notFound();
  }

  return { today, create, getById, update, remove };
}

module.exports = { createDeviceService };