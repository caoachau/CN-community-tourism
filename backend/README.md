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

Swagger UI is available at `http://localhost:5000/api/docs/`; the OpenAPI document is at `/api/openapi.json`. See [API.md](API.md) for authentication, role/ownership guards, account blocking, shared validation, errors and logging. Configure `API_DOCS_ENABLED=false` to disable both documentation endpoints and `LOG_LEVEL` to control verbosity. Authentication is mounted under `/api/v1/auth`; ADMIN can block/unblock accounts through `PATCH /api/v1/admin/users/:userId/status`. Blocking revokes every session and records an audit event atomically. Unblocking requires a new login and does not change household approval or existing bookings.

`npm run db:check:tls --workspace backend` also checks that an unrelated CA and a wrong TLS hostname are rejected. Both commands only inspect the connection and set its session timezone; neither runs migrations, seeds or business writes.

Household onboarding is mounted under `/api/v1/households`: open a draft, save versioned profiles, submit and read revision history. ADMIN reviews submitted revisions under `/api/v1/admin/household-applications`. Approval atomically publishes the profile, grants HOUSEHOLD while retaining CUSTOMER rights, writes audit events and an in-app notification. Existing sessions use the live DB role. See [API.md](API.md) and Swagger for request examples, optimistic version checks, rejections and edits of published profiles. This module uses the existing tables and needs no additional migration.

The catalog module adds global ADMIN-managed SERVICE/PRODUCT/CONTENT categories under `/api/v1/admin/categories`, owned places under `/api/v1/households/me/places`, and versioned place reviews under `/api/v1/admin/place-submissions`. Guest reads use `/api/v1/public/categories` and `/api/v1/public/places`; they expose only active taxonomy and approved published locations belonging to visible approved households with active owners. Draft/review/account data stays private. Place/category state changes preserve history and have optimistic concurrency checks. No additional migration or seed is needed; see [API.md](API.md) for payloads and publication rules.

## Render

See [RENDER.md](RENDER.md) and the root [render.yaml](../render.yaml). With `rootDir: backend`, Build Command is `npm ci --omit=dev --no-audit --no-fund` and Start Command is `npm start`.

`backend/package-lock.json` supports standalone deployment; the root lockfile supports the complete npm workspace. Keep both in sync when backend dependencies change. For example, after editing `backend/package.json`, run `npm install` at the root and `npm install --package-lock-only --ignore-scripts --workspaces=false` **from inside `backend/`**. Confirm neither lockfile introduces a `file:..` dependency; `npm ci` must also pass in a clean copy containing only backend files.

## Tests

`npm test` runs unit, HTTP and OpenAPI contract tests without MySQL. `npm run check --workspace backend` checks syntax for every JavaScript file under `src/` and `scripts/`. From the repository root, `npm run test:db:up` starts the dedicated local MySQL 8.4.11 container, then `npm run test:integration` creates isolated schemas and applies the real migration. `npm run test:db:prepare` keeps a new schema with basic fixtures for Workbench. See [test/README.md](test/README.md) for isolation, cleanup and the CI workflow.

The earlier Aiven deployment (2026-10-12) used migrations `001`/`002`: **30 application tables, 356 columns, 76 foreign keys**, plus `schema_migrations`; no seed. Those migrations remain immutable. Migration `002` only upgrades an empty installation through its staged replacement runner; never import it into Workbench as an in-place upgrade. The recorded backup is `ctp_v2_backup_d372efba83b7`; do not restore over subsequent writes without reconciling them.

Migration `003_survey_schema.sql` upgrades populated installations to **34 application tables** while preserving old rows/IDs. It was applied and verified on Aiven `community-tourism-db` on 2026-10-20: **35 tables including history, 461 application columns, 112 foreign keys and 175 CHECKs including history**; migrations 001–003 APPLIED, no seed. See [survey schema and migration contract](schema/survey-design.md) and [CDM mapping](schema/survey-mapping.json). The [reference schema.sql](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/schema.sql) is for a new empty schema only. Other installations apply `003` through the runner with a real maintenance window and `--maintenance-confirmed`, in addition to the existing host/database/plan confirmations. `npm run db:schema:export` regenerates and verifies the reference SQL using isolated local test databases without seed.

Local `.env` selects the application database and is Git-ignored. `npm run db:migrate:plan --workspace backend` inspects the target without writes; `npm run db:migrate:verify --workspace backend` verifies structure/history. Apply requires matching `--confirm-database`, `--confirm-host` and `--confirm-plan` flags; a missing database additionally requires `--create-database`. Startup never applies migrations or seeds. See [business transaction rules](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/QUY_TAC_CSDL.md) and [read-only Workbench queries](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/KIEM_TRA_AIVEN_WORKBENCH.sql).
