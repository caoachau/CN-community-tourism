# Community Tourism Platform

Monorepo for the community tourism project: Express REST API, React admin, planned Flutter apps, and project documentation. Repository text files use UTF-8. Environment variable names are uppercase `SCREAMING_SNAKE_CASE`; secrets belong only in ignored local `.env` files or deployment secret stores. Runtime logs are one-line JSON to stdout/stderr.

## Prerequisites

- Node.js 22.12+ and npm 10+
- Git
- Flutter stable and Android SDK for mobile work (see the current blocker in [`mobile-app/README.md`](mobile-app/README.md))

## Start backend and admin

In PowerShell, from the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item admin-web/.env.example admin-web/.env
npm install
npm run dev:backend
```

In a second terminal, run `npm run dev:admin`. The API listens on `http://localhost:5000`; the admin UI listens on the Vite development URL (normally `http://localhost:5173`). The admin health card checks the API.

Check the API directly:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected response includes `success: true` and `data.status: "ok"`. This is a liveness endpoint only; Prisma/Aiven readiness is outside this setup task.

## Build and checks

```powershell
npm run check
npm test
```

`npm run check` validates backend JavaScript syntax and creates the production React build under ignored `admin-web/dist/`. `npm test` runs backend tests.

## Workspace map

- `backend/` — Express API
- `admin-web/` — React + Vite admin skeleton
- `mobile-app/` — Flutter toolchain verification and setup notes
- `docs/` — Jira plan and project documentation

Do not commit `.env`, credentials, signing keys, generated build output, or Android local SDK paths. The `.env.example` files contain names and local non-secret defaults only.
