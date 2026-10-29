# Ảnh backend Smart CRM L2. Build từ GỐC repo (docker-compose.yml đặt context: .) vì migrations/ và seeds/
# nằm ở gốc, còn db/migrate.js và db/seed.js đọc chúng theo đường dẫn tương đối ../../../
# ---------- Giai đoạn 1: cài thư viện đúng phiên bản trong package-lock.json ----------
FROM node:20-alpine AS deps
WORKDIR /app/src/backend
# Chép tệp khóa trước mã nguồn để Docker dùng lại lớp cache khi chỉ sửa mã.
COPY src/backend/package.json src/backend/package-lock.json ./
RUN npm ci --omit=dev

# ---------- Giai đoạn 2: ảnh chạy ----------
FROM node:20-alpine
ENV NODE_ENV=production APP_PORT=3000
WORKDIR /app/src/backend
COPY --from=deps /app/src/backend/node_modules ./node_modules
COPY migrations /app/migrations
COPY seeds /app/seeds
COPY src/backend ./
# Chạy bằng người dùng không đặc quyền "node" có sẵn trong ảnh node.
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=6 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Migrate và seed đều chạy lại được nhiều lần không nhân đôi, nên chạy mỗi lần container khởi động.
CMD ["sh", "-c", "node db/migrate.js && node db/seed.js && exec node index.js"]