// Lớp nghiệp vụ: quy tắc QT-01, QT-02, QT-13, QT-15. Không biết gì về HTTP (req, res, mã trạng thái).
const AppError = require('../errors/AppError');
const { normalizePhone, maskPhone } = require('./phone');

function createCustomerService(repo) {
  const view = c => ({ ...c, phone: maskPhone(c.phone) });

  function requirePhone(raw) {
    const phone = normalizePhone(raw);
    if (!phone) throw new AppError('INVALID_PHONE', 'Số điện thoại không hợp lệ');
    return phone;
  }

  async function lookupByPhone(rawPhone) {
    const phone = requirePhone(rawPhone);
    const customer = await repo.findByPhone(phone);
    if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', 'Chưa có hồ sơ khách hàng với số này');
    return { ...view(customer), devices: await repo.findDevices(customer.customer_id) };
  }

  async function getById(id) {
    const customer = await repo.findById(id);
    if (!customer) throw new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    return { ...view(customer), devices: await repo.findDevices(id) };
  }

  async function create(data) {
    const phone = requirePhone(data.phone);
    const existing = await repo.findByPhone(phone);
    if (existing) {
      throw new AppError('PHONE_EXISTS', 'Số điện thoại đã có hồ sơ', { existing_customer: view(existing) });
    }
    return view(await repo.create({ ...data, phone }));
  }

  async function update(id, data) {
    const fields = {};
    for (const k of ['full_name', 'email', 'address']) if (data[k] !== undefined) fields[k] = data[k];
    if (data.phone !== undefined) {
      const phone = requirePhone(data.phone);
      const other = await repo.findByPhone(phone);
      if (other && String(other.customer_id) !== String(id)) {
        throw new AppError('PHONE_EXISTS', 'Số điện thoại đã có hồ sơ', { existing_customer: view(other) });
      }
      fields.phone = phone;
    }
    const updated = await repo.update(id, fields);
    if (!updated) throw new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
    return view(updated);
  }

  // QT-13: không xóa vật lý, chỉ đánh dấu ngừng sử dụng.
  async function remove(id) {
    if (!(await repo.deactivate(id))) throw new AppError('CUSTOMER_NOT_FOUND', 'Không tìm thấy khách hàng');
  }

  return { lookupByPhone, getById, create, update, remove };
}

module.exports = { createCustomerService };