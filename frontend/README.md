# Orbit EMS frontend

This directory contains **frontend code only**. It connects to the Spring Boot backend already in this repository; it does not duplicate or modify Java controllers, entities, security, database code or migrations.

## Run locally

Requirements: Node.js 20+ and pnpm 10+ (npm also works).

1. Start the existing Spring Boot app from the repository root on `http://localhost:8080`:

   ```sh
   mvn spring-boot:run
   ```

2. In a second terminal:

   ```sh
   cd frontend
   pnpm install
   pnpm dev
   ```

3. Open the Vite URL printed in the terminal. The dev server proxies `/api/*` to `http://localhost:8080`. If the backend uses another address, set `VITE_API_PROXY_TARGET` (see `.env.example`).

## Build and checks

```sh
pnpm check
pnpm build
```

The production bundle is written to `frontend/dist`. For a same-origin production deployment, serve this static bundle alongside the existing API so browser requests to `/api/*` reach Spring Boot. For separate origins, set `VITE_API_BASE_URL` at build time and configure CORS on the backend. No backend changes are included in this frontend folder.

## Integration and limits

Authentication uses the existing `POST /api/auth/login` response (`token`, `email`, `role`) and sends `Authorization: Bearer <token>` to the existing REST API. The token is kept in tab-scoped `sessionStorage`; sign out clears it. The UI uses the existing employee, department, attendance and leave endpoints and respects the `ADMIN`, `MANAGER` and `EMPLOYEE` roles enforced by the backend.

The current backend does not expose payroll, performance-review, document-storage, or user-list endpoints. These are shown as unavailable rather than populated with mock records. Reports are computed in the browser from real endpoint responses the current user is permitted to access.
