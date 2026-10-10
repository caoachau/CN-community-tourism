# Community Tourism Platform

Monorepo for the community tourism project: Express REST API, React admin, Flutter projects, and project documentation. Repository text files use UTF-8. Environment variable names are uppercase `SCREAMING_SNAKE_CASE`; secrets belong only in ignored local `.env` files or deployment secret stores. Runtime logs are one-line JSON to stdout/stderr.

## Prerequisites

- Node.js 22.12+ and npm 10+
- Git
- Flutter and Android SDK for the projects under `frontend/mobile-app/`

## Start backend and admin

In PowerShell, from the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/admin-web/.env.example frontend/admin-web/.env
npm install
npm run db:check --workspace backend
npm run dev:backend
```

Fill the Aiven URI and CA settings in `backend/.env` before checking or starting the backend. In a second terminal, run `npm run dev:admin`. The API listens on `http://localhost:5000`; the admin UI listens on the Vite development URL (normally `http://localhost:5173`). The admin health card checks the API.

Check the API directly:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected response includes `success: true` and `data.status: "ok"`. This is a liveness endpoint. `/api/ready` checks the database and returns 200 or 503; startup verifies Aiven TLS before listening. See [Render deployment](backend/RENDER.md) for the Free Blueprint and environment settings.

## Build and checks

```powershell
npm run check
npm test
```

`npm run check` validates backend JavaScript syntax and creates the production React build under ignored `frontend/admin-web/dist/`. `npm test` runs backend unit/HTTP tests without a database. Run `npm run test:db:up` followed by `npm run test:integration` for the real MySQL 8.4.11 migration/constraint/transaction suite. See the [test harness guide](backend/test/README.md); these checks do not execute against Aiven or replace future booking API acceptance tests.

## Workspace map

- `backend/` — Express API
- `frontend/admin-web/` — React + Vite admin skeleton
- `frontend/mobile-app/flutter_ho/` — household Flutter project
- `frontend/mobile-app/flutter_khach/` — customer Flutter project
- `Tai lieu he thong/` — MVP, architecture, use cases, source workbook and database design
- `backend/migrations/` — proposed versioned database DDL

## Database design

Start with the [database design](Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/README.md), including the workbook review, ERD, data dictionary, transaction rules and Aiven/MySQL Workbench instructions. The initial SQL targets the user's Aiven MySQL 8.4.11 service; it has not been deployed. Flutter and React call the API and never connect directly to Aiven.

Do not commit `.env`, credentials, signing keys, generated build output, or Android local SDK paths. The `.env.example` files contain names and local non-secret defaults only.
