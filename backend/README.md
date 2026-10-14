# Backend API

## Local setup

From the repository root, copy `backend/.env.example` to `backend/.env`, then run:

```powershell
npm install
npm run db:check --workspace backend
npm run dev:backend
```

The API listens on `http://localhost:5000`. Verify it with:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Fill `DATABASE_URL` with the current Aiven URI and configure `DB_SSL_CA_PATH` before starting. Set `JWT_SECRET` to a unique random secret of at least 32 bytes (for example, 48 random bytes encoded as base64url); an empty/placeholder key prevents startup. Credentials stay in the ignored `.env`. The backend uses `mysql2/promise` with CA and hostname verification; startup requires a successful TLS/database check.

`/api/health` reports process liveness. `/api/ready` verifies the database connection and returns 200 or a generic 503 without exposing connection details. Shutdown closes HTTP and the database pool.

Swagger UI is available at `http://localhost:5000/api/docs/`; the OpenAPI document is at `/api/openapi.json`. See [API.md](API.md) for authentication, shared Zod validation, error codes/envelopes, request IDs and JSON logging. Configure `API_DOCS_ENABLED=false` to disable both documentation endpoints and `LOG_LEVEL` to control verbosity. Authentication is mounted under `/api/v1/auth` and documented alongside health/readiness.

`npm run db:check:tls --workspace backend` also checks that an unrelated CA and a wrong TLS hostname are rejected. Both commands only inspect the connection and set its session timezone; neither runs migrations, seeds or business writes.

## Render

See [RENDER.md](RENDER.md) and the root [render.yaml](../render.yaml). With `rootDir: backend`, Build Command is `npm ci --omit=dev --no-audit --no-fund` and Start Command is `npm start`.

`backend/package-lock.json` supports standalone deployment; the root lockfile supports the complete npm workspace. Keep both in sync when backend dependencies change. For example, after editing `backend/package.json`, run `npm install` at the root and `npm install --package-lock-only --ignore-scripts --workspaces=false` **from inside `backend/`**. Confirm neither lockfile introduces a `file:..` dependency; `npm ci` must also pass in a clean copy containing only backend files.

## Tests

`npm test` runs unit, HTTP and OpenAPI contract tests without MySQL. `npm run check --workspace backend` checks syntax for every JavaScript file under `src/` and `scripts/`. From the repository root, `npm run test:db:up` starts the dedicated local MySQL 8.4.11 container, then `npm run test:integration` creates isolated schemas and applies the real migration. `npm run test:db:prepare` keeps a new schema with basic fixtures for Workbench. See [test/README.md](test/README.md) for isolation, cleanup and the CI workflow.

The current [MySQL schema](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/schema.sql) was deployed to Aiven `community-tourism-db` on 2026-10-12: **30 business tables, 356 business columns, 76 foreign keys**, plus `schema_migrations`. Migrations `001` and `002` are APPLIED; no seed was run. Both numbered files are immutable, including their historical filenames. Migration `002` must run through `scripts/migrate.js`, never as an in-place Workbench import: it only upgrades an empty installation, builds a separate schema, locks and atomically swaps table sets, and preserves old tables/history in a backup schema. An installation with business data requires a separate backfill plan. The current backup is `ctp_v2_backup_d372efba83b7`; do not reset from it after new writes without reconciling those writes.

Local `.env` selects the application database and is Git-ignored. `npm run db:migrate:plan --workspace backend` inspects the target without writes; `npm run db:migrate:verify --workspace backend` verifies structure/history. Apply requires matching `--confirm-database`, `--confirm-host` and `--confirm-plan` flags; a missing database additionally requires `--create-database`. Startup never applies migrations or seeds. See [business transaction rules](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/QUY_TAC_CSDL.md) and [read-only Workbench queries](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/KIEM_TRA_AIVEN_WORKBENCH.sql).
