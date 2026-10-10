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

The health route is a process liveness check; no database connection is claimed by this endpoint yet. The architecture selects mysql2/promise, which will be added when the data layer is implemented.

The proposed MySQL schema is in [`migrations/`](migrations/README.md). See the [database design](../Tai%20lieu%20he%20thong/Thiet%20ke%20CSDL/README.md) for the ERD, workbook analysis and required transaction rules. Migrations are not run at API startup.
