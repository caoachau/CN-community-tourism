# Render Free + Aiven MySQL TLS

Prepared and checked on 2026-10-10. Driver: `mysql2/promise` 3.24.5. No Prisma dependency or migration/seed execution is part of this deployment.

## Configuration to review before creating the service

The root [`render.yaml`](../render.yaml) defines one Web Service:

| Setting | Value |
| --- | --- |
| Repository | `caocahau/CN-community-tourism` |
| Branch | `master` |
| Name | `community-tourism-api` |
| Runtime | Node.js 22, Express, JavaScript ESM |
| Root Directory | `backend` |
| Region | Singapore, proposed for this demo; confirm before creation |
| Plan | `free` |
| Build Command | `npm ci --omit=dev --no-audit --no-fund` |
| Start Command | `npm start` |
| Health Check Path | `/api/ready` |
| Automatic deploys | Off; deploy deliberately after reviewing changes |

Render's Root Directory makes files outside `backend/` unavailable during build/runtime. The standalone `backend/package-lock.json` therefore accompanies the root workspace lockfile. The backend does not require a frontend build, TypeScript compilation, Prisma generation, or local CA file from the documentation folder on Render. [Render monorepos](https://render.com/docs/monorepo-support)

The Free compute instance has no recurring compute charge. It sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Free services have no Shell/SSH or one-off jobs. Bandwidth and build minutes count against workspace allowances; excess usage can incur charges when billing is enabled. This Blueprint adds no paid disk, worker, cron, or Render database. Existing Aiven costs are separate; the workspace bill has not been inspected. Review the creation screen and Billing settings before confirming. [Render Free limits](https://render.com/docs/free)

An in-process expiry job will pause while the Free service sleeps. Future booking commands must still enforce hold deadlines from database time, as required by the business specification.

## Environment variables and certificate

The YAML contains only non-secret settings and `sync: false` placeholders. Enter the real values in the Render creation form or Environment settings, never in Git or a chat message.

| Variable | Value to supply |
| --- | --- |
| `DATABASE_URL` | Current MySQL Service URI with database path `/community-tourism-db` after that schema is created. The Console may still show `/defaultdb`; change only the database path. Use the current password; percent-encode reserved characters if constructing the URI manually. |
| `DB_SSL_CA` | Entire contents of the Aiven project's `ca.pem`, including BEGIN/END lines and real newlines. Paste as a multiline environment value, without surrounding quotes. |
| `CORS_ORIGIN` | Allowed React Admin origin, such as `http://localhost:5173` while testing locally. Multiple origins are comma-separated; do not include trailing slashes. Flutter native clients do not require a browser origin. |
| `DB_EXPECTED_DATABASE` | `community-tourism-db`, already set in YAML; the schema must be created through the approved migration before API startup. |
| `DB_POOL_SIZE` | `5`, already set; bounded to 1–10 by the application. |
| `NODE_ENV` / `NODE_VERSION` | `production` / `22`, already set. |

Use the Aiven DNS hostname, not its current IP address. A copied `?ssl-mode=REQUIRED` parameter is accepted, but the application explicitly enables stronger verification with `ssl.ca`, `rejectUnauthorized: true`, `verifyIdentity: true` and minimum TLS 1.2. Other URI options are rejected instead of silently changing driver behavior. Numeric IDs/DECIMAL values retain precision. [MySQL2 TLS](https://sidorares.github.io/node-mysql2/docs/documentation/ssl), [Aiven CA requirements](https://aiven.io/docs/platform/concepts/tls-ssl-certificates)

Alternative: upload `ca.pem` as a Render Secret File and set `DB_SSL_CA_PATH=/etc/secrets/ca.pem`. In that case remove `DB_SSL_CA` from both YAML and Render Environment; exactly one CA source is allowed. For local development, the example uses `DB_SSL_CA_PATH` relative to `backend/`. [Render secret files](https://render.com/docs/configure-environment-variables)

Do not set `PORT` manually on Render. The server binds `0.0.0.0` and reads Render's supplied `PORT`. It exits before opening the port if credentials, CA, database identity, or the TLS check fail. It does not print the URL, password, CA, or raw database error messages.

## Create via the Git Blueprint

1. Review, commit and push these changes to `master`. This work did not commit or push them.
2. In Render, connect GitHub and grant access to `caocahau/CN-community-tourism`.
3. Choose **New → Blueprint**, select the repository and `master`, and use the root `render.yaml`.
4. Review that the only resource is `community-tourism-api`, **Free**, Singapore. Fill the three prompted values above. Confirm configuration and costs before choosing the final create/deploy action.
5. If Aiven restricts client IPs, copy this service's **Connect → Outbound** CIDR ranges into the Aiven allowed IP list. Use the listed outbound ranges, not the service's public web IP. Retry deployment if the first attempt occurred before allowlisting. [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)
6. Check deployment logs for `Database TLS verified` and `API listening`. This is the first real evidence of a connection originating from Render.
7. Open `https://<assigned-service-name>.onrender.com/api/ready`. Expected response: `{"success":true,"data":{"status":"ready"}}`. `/api/health` remains a separate liveness endpoint.

If using **New → Web Service** manually instead, enter the exact values from the configuration table; the service is not automatically Blueprint-managed merely because `render.yaml` exists.

The Render integration was discovered but was not connected during preparation. Install/connect Render in this chat to enable direct service inspection/creation; credentials should go through the connection flow. GitHub access in Render is still necessary. Creating the service remains a separate action after confirmation of this concrete configuration and costs.

## Verify without Shell on Free

Normal `npm start` already verifies database identity and the encrypted session before starting HTTP. Readiness repeats a bounded connection check. No Shell is required for these checks.

For an explicit negative TLS test **on Render**, temporarily change the Start Command in the Blueprint to:

```sh
npm run db:check:tls && npm start
```

Sync/deploy, retain the sanitised logs showing the valid CA succeeds and wrong CA/hostname fail, then restore `npm start`. A failed or inconclusive check exits nonzero and prevents the API from starting. Do not put checks or migrations into the Build Command; runtime network/secret configuration must be tested at runtime.

Local equivalent, from the repository root with `backend/.env` configured:

```powershell
npm run db:check --workspace backend
npm run db:check:tls --workspace backend
```

Both commands perform `SELECT`, `SHOW SESSION STATUS` and `SET SESSION time_zone` only. Neither creates tables, imports `001_initial_schema.sql`, runs seeds nor modifies business records.

## Actual validation results

| Check | Result |
| --- | --- |
| Local → Aiven, current CA + DNS hostname | PASS; MySQL 8.4.11 |
| Negotiated session | TLSv1.3, `TLS_AES_256_GCM_SHA384` |
| Unrelated trusted CA substituted | Rejected, `HANDSHAKE_SSL_ERROR`; PASS |
| Wrong TLS hostname while dialing the same Aiven host | Rejected, `HANDSHAKE_SSL_ERROR`; PASS |
| Configuration, failure handling and readiness tests | 27 Node tests; PASS |
| Standalone backend directory with its own lockfile | `npm ci --omit=dev --no-audit --no-fund`, syntax checks and tests pass outside the monorepo |
| Standalone server, multiline CA environment + live Aiven | Startup verified TLS; `/api/ready` and `/api/health` both returned 200 locally |
| Blueprint | Validated against Render's official JSON Schema; Free-only resource and secret placeholders checked |
| Render → Aiven | **Not executed yet**: no Web Service or connected Render account |
| Migration/seed/schema/business-concurrency validation | **Not executed** in this task |

A successful TLS check proves connectivity and server identity. It does not prove that the 41 application tables exist or that booking transactions have been implemented.
