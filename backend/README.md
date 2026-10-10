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

Fill `DATABASE_URL` with the current Aiven URI and configure `DB_SSL_CA_PATH` before starting. Credentials stay in the ignored `.env`. The backend uses `mysql2/promise` with CA and hostname verification; startup requires a successful TLS/database check.

`/api/health` reports process liveness. `/api/ready` verifies the database connection and returns 200 or a generic 503 without exposing connection details. Shutdown closes HTTP and the database pool.

`npm run db:check:tls --workspace backend` also checks that an unrelated CA and a wrong TLS hostname are rejected. Both commands only inspect the connection and set its session timezone; neither runs migrations, seeds or business writes.

## Render

See [RENDER.md](RENDER.md) and the root [render.yaml](../render.yaml). With `rootDir: backend`, Build Command is `npm ci --omit=dev --no-audit --no-fund` and Start Command is `npm start`.

`backend/package-lock.json` supports standalone deployment; the root lockfile supports the complete npm workspace. Keep both in sync when backend dependencies change. For example, after editing `backend/package.json`, run `npm install` at the root and `npm install --package-lock-only --ignore-scripts --workspaces=false` **from inside `backend/`**. Confirm neither lockfile introduces a `file:..` dependency; `npm ci` must also pass in a clean copy containing only backend files.

## Tests

`npm test` runs unit and HTTP tests without MySQL. From the repository root, `npm run test:db:up` starts the dedicated local MySQL 8.4.11 container, then `npm run test:integration` creates isolated schemas and applies the real migration. `npm run test:db:prepare` keeps a new schema with basic fixtures for Workbench. See [test/README.md](test/README.md) for isolation, cleanup and the CI workflow.

The proposed MySQL schema is in [`migrations/`](migrations/README.md). See the [database design](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/README.md) for the ERD, workbook analysis and required transaction rules. Migrations are not run at API startup.
