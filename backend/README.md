# Backend API

## Local setup

From the repository root, copy `backend/.env.example` to `backend/.env`, then run:

```powershell
npm install
npm run dev:backend
```

The API listens on `http://localhost:5000`. Verify it with:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

The health route is a process liveness check. Database readiness will be added with the Prisma/Aiven task; no database connection is claimed by this endpoint yet.
