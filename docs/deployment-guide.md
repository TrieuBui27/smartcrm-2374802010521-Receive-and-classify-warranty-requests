# Deployment Guide – Smart CRM L2 (Receive and classify warranty requests)

Three containers: PostgreSQL (`db`), Node.js API (`api`, runs migrations and loads sample data on start) and the React web app served by nginx (`web`). The same two commands work on Windows PowerShell, macOS and Linux.

## 1. Requirements

| Item | Requirement |
|---|---|
| Operating system | Windows 10/11 (Docker Desktop), macOS 12+, or Linux |
| Docker | Docker Engine 24+ or Docker Desktop 4.x with **Compose v2** (`docker compose version` must work) |
| Git | Any recent version |
| Free TCP ports | **3000** (API) and **5173** (web). Change `APP_PORT` or `WEB_PORT` in `.env` if busy. PostgreSQL is not published to the host |
| Disk and memory | About 2 GB of disk (images `postgres:16-alpine`, `node:20-alpine`, `nginx:1.27-alpine`) and 2 GB of memory for Docker |
| Internet access | Needed on the first build (pull images, `npm ci`) |
| Node.js / PostgreSQL | **Not needed** with Docker. Only for the non-Docker run and for `npm test` (Node.js 20+, PostgreSQL 14+) |

## 2. Setup steps

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

## 4. Sample data

The `api` container loads the sample data automatically on every start (it is repeatable, a second start adds 0 rows). After the first start the database holds **6 issue categories, 12 employees, 139 customers, 25 devices, 25 tickets and 119 status-log rows**; `docker compose logs api` shows these totals.

| Role | Accounts | Can do |
|---|---|---|
| Receiving staff | `nv_tt01` … `nv_tt06` | Look up and create customers and devices, create tickets, read tickets of its center, close or cancel |
| Center manager | `ql_tt01` … `ql_tt06` | Read tickets of its center and move them through the life cycle |

Each account sees only the tickets of its own center (QT-14). Center 4 has overdue tickets.

## 5. Verify it works

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

## 6. Enabling HTTPS for a real deployment

This prototype serves plain HTTP on `localhost`, which is fine for the demo. For a real deployment:

1. Put a reverse proxy with a TLS certificate (nginx, Caddy or a cloud load balancer) in front of the `web` and `api` containers and publish only port 443.
2. Make the proxy send the original scheme in the `X-Forwarded-Proto` header, and set `CORS_ORIGIN` and `WEB_PORT` to the `https://` address of the web app.
3. Change `DB_PASSWORD`, `SECRET_KEY` and `SEED_PASSWORD`, and do not load the 12 demo accounts.

Not done in this prototype: the API does not yet read `X-Forwarded-Proto` or redirect HTTP to HTTPS, and tokens are kept in the browser's `localStorage` (see the risk table in the security checklist, `docs/checklist-bao-mat.md`).

## 7. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | Docker Desktop is not running. Start it, wait until it says "Engine running", then run the command again |
| `port is already allocated` or `Port 5173 is already in use` | Another program uses 3000 or 5173 (for example a Vite dev server). Stop it, or set `APP_PORT` / `WEB_PORT` in `.env` and run `docker compose up -d --build` again |
| `docker compose up` stops with a message about `SECRET_KEY` or `DB_PASSWORD` | `.env` is missing or empty. Run `cp .env.example .env` first |
| `api` never becomes `healthy` | Read `docker compose logs api`; usually the database is still starting. Wait one minute. For a clean start run `docker compose down -v` and then `docker compose up -d --build` |
| The first build is slow | It pulls the images and runs `npm ci` twice; this takes a few minutes once, later builds use the cache |