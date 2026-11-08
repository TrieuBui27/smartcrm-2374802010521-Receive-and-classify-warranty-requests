# Deployment Guide – Smart CRM L2 (Receive and classify warranty requests)

Three containers: PostgreSQL (`db`), Node.js API (`api`, runs migrations and loads sample data on start) and the React web app served by nginx (`web`). The same two commands work on Windows PowerShell, macOS and Linux.

## 1. Environment requirements

| Item | Requirement |
|---|---|
| Operating system | Windows 10/11 (Docker Desktop), macOS 12+, or Linux |
| Docker | Docker Engine 24+ or Docker Desktop 4.x with **Compose v2** (`docker compose version` must work) |
| Git | Any recent version |
| Free TCP ports | **3000** (API) and **5173** (web). Change `APP_PORT` or `WEB_PORT` in `.env` if busy. PostgreSQL is not published to the host |
| Disk and memory | About 2 GB of disk (images `postgres:16-alpine`, `node:20-alpine`, `nginx:1.27-alpine`) and 2 GB of memory for Docker |
| Internet access | Needed on the first build (pull images, `npm ci`) |
| Node.js / PostgreSQL | **Not needed** with Docker. Only for the non-Docker run and for `npm test` (Node.js 20+, PostgreSQL 14+) |

## 2. Steps to build the system

```bash
git clone --branch v1.0 https://github.com/TrieuBui27/smartcrm-2374802010521-Receive-and-classify-warranty-requests.git
cd smartcrm-2374802010521-Receive-and-classify-warranty-requests

cp .env.example .env            # command 1 of 2 (PowerShell: Copy-Item .env.example .env)
docker compose up -d --build    # command 2 of 2
```

Compose starts `db` (waits for PostgreSQL) → `api` (migrate, seed, start; both repeatable) → `web` (waits until `api` is healthy). Stop with `docker compose down` (keeps data) or `docker compose down -v` (deletes the database volume).

## 3. Environment variables

`.env` is copied from `.env.example`, is ignored by git and must never be committed.

| Variable | Meaning | Sample value | Required? |
|---|---|---|---|
| `DB_NAME` | Application database name | `smartcrm` | No |
| `DB_USER` | PostgreSQL user | `postgres` | Yes |
| `DB_PASSWORD` | Password of that user; change it for a real deployment | `doi_mat_khau_nay` | Yes |
| `SECRET_KEY` | Key that signs JWTs; random string of 32+ characters; Compose refuses to start without it | `doi_chuoi_bi_mat_nay_...` | Yes |
| `APP_PORT` | Host port of the API | `3000` | No |
| `WEB_PORT` | Host port of the web app (the API allows CORS from it) | `5173` | No |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `info` | No |
| `SEED_PASSWORD` | Password of the 12 demo accounts; **change before a real deployment** | `Mekong@2026` | No |
| `CORS_ORIGIN` | Allowed browser origin when the API runs outside Docker | `http://localhost:5173` | No |
| `DB_HOST`, `DB_PORT` | Database address when the API runs directly with Node | `localhost`, `5432` | No in Docker |

## 4. Demo accounts and sample data

The seed loads 6 issue categories, 12 employees, 139 customers, 25 devices, 25 tickets and 119 status-log rows.

| Role | Accounts | Can do |
|---|---|---|
| Receiving staff | `nv_tt01` … `nv_tt06` | Look up and create customers and devices, create tickets, read tickets of its center, close or cancel |
| Center manager | `ql_tt01` … `ql_tt06` | Read tickets of its center and move them through the life cycle |

Each account sees only the tickets of its own center (QT-14). Center 4 has overdue tickets.

## 5. How to check that the system works

```bash
docker compose ps                      # db, api: (healthy); web: running
curl http://localhost:3000/health      # {"status":"ok","db":"ok"}   (PowerShell: curl.exe)
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"nv_tt04","password":"Mekong@2026"}'
curl http://localhost:3000/api/tickets # 401 without a token
docker compose exec api node db/seed.js   # repeatable: 0 new rows
```

The login answers `200` with `access_token`, `role` `NHAN_VIEN_TIEP_NHAN` and `center_id` 4. Open `http://localhost:5173` and log in as `nv_tt04`: the ticket list of center 4 appears, with overdue tickets marked.

Automated tests (Node.js 20+ and a migrated, seeded PostgreSQL):

```bash
cd src/backend && npm ci && npm run db:migrate && npm run db:seed && npm test
```

Expected: `# tests 82`, `# pass 82`, `# fail 0`. The same suite runs on every push in GitHub Actions (`.github/workflows/ci.yml`).