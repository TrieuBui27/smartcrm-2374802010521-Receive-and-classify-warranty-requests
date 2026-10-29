# Ảnh giao diện Smart CRM L2: build bằng Vite rồi phục vụ tệp tĩnh bằng nginx.
# ---------- Giai đoạn 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite gắn địa chỉ backend vào mã lúc build, nên địa chỉ truyền bằng build arg (docker-compose.yml).
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- Giai đoạn 2: nginx chạy bằng người dùng không đặc quyền ở cổng 8080 ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html \
 && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
USER nginx
EXPOSE 8080