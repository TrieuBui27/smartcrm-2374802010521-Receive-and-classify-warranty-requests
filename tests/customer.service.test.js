// Kiểm thử CustomerService bằng repository giả: không cần CSDL thật.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCustomerService } = require('../src/backend/services/customer.service');

function fakeRepo(rows = []) {
  const data = rows.map((r, i) => ({ customer_id: i + 1, is_active: true, ...r }));
  return {
    async findByPhone(phone) { return data.find(c => c.phone === phone && c.is_active) || null; },
    async findById(id) { return data.find(c => String(c.customer_id) === String(id) && c.is_active) || null; },
    async findDevices() { return []; },
    async create(c) { const row = { customer_id: data.length + 1, is_active: true, ...c }; data.push(row); return row; },
    async update(id, f) { const c = await this.findById(id); return c ? Object.assign(c, f) : null; },
    async deactivate(id) { const c = await this.findById(id); if (!c) return false; c.is_active = false; return true; },
  };
}

test('luồng đúng: tạo khách lưu số đã chuẩn hóa, trả số đã che', async () => {
  const repo = fakeRepo();
  const svc = createCustomerService(repo);
  const c = await svc.create({ full_name: 'Nguyễn Văn An', phone: '0901 234 567' });
  assert.equal(c.phone, '090****567');
  assert.equal((await repo.findById(c.customer_id)).phone, '0901234567');
});

test('QT-01: số đã có hồ sơ (viết khác dạng) thì từ chối PHONE_EXISTS', async () => {
  const svc = createCustomerService(fakeRepo([{ full_name: 'An', phone: '0901234567' }]));
  await assert.rejects(svc.create({ full_name: 'An 2', phone: '+84901234567' }), { code: 'PHONE_EXISTS' });
});

test('dữ liệu sai: số không chuẩn hóa được thì INVALID_PHONE; không có hồ sơ thì CUSTOMER_NOT_FOUND', async () => {
  const svc = createCustomerService(fakeRepo());
  await assert.rejects(svc.lookupByPhone('12345'), { code: 'INVALID_PHONE' });
  await assert.rejects(svc.lookupByPhone('0909999999'), { code: 'CUSTOMER_NOT_FOUND' });
});

test('QT-13: xóa là ngừng sử dụng, tra cứu lại không thấy', async () => {
  const svc = createCustomerService(fakeRepo([{ full_name: 'An', phone: '0901234567' }]));
  await svc.remove(1);
  await assert.rejects(svc.getById(1), { code: 'CUSTOMER_NOT_FOUND' });
});
