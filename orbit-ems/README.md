# Orbit — Employee Management System

Orbit is a persistent, role-aware employee-operations workspace built on the managed web-db-user starter. It keeps the starter’s real OAuth authentication, session and MySQL-compatible managed database. EMS records use Prisma; authentication user records continue to use Drizzle. Uploaded files go through the preconfigured managed object-storage service; the database stores metadata, owner, object key and soft-delete state.

## Features

- **Dashboard:** live headcount, attendance, pending leave, department distribution, weekly attendance chart and activity.
- **Employees:** HR/Admin create, update and archive-safe removal, profiles, department assignment, search, status filters and pagination. Payroll fields are server-redacted for employees.
- **Departments:** create, edit, list and remove empty teams; an employee is assigned through their profile.
- **Attendance:** employee check-in/out, persisted daily records, status and date view, history.
- **Leave:** self-service request forms, leave balances, request history, HR/Admin approval and rejection.
- **Payroll:** payroll-period records, validated gross/deduction/net calculation and processed status; employee access is restricted to their own pay history.
- **Performance:** self goals, progress and review records; Admin/HR write reviews.
- **Reports:** charts plus CSV/PDF export. Authorized organization reports and employee-owned exports can be stored in Documents.
- **Documents:** allow-listed PDF, DOCX, XLSX, CSV, TXT, PNG and JPEG uploads (10 MB maximum), managed durable object storage, checked owner metadata, authorized download links and application soft deletion.
- **Settings:** Admin-only account roles and employee-profile linking. New OAuth accounts start with least-privileged Employee access; the project owner receives Admin access through the starter identity policy.

## Stack and architecture

React, TypeScript, Tailwind CSS, Wouter, Three.js / React Three Fiber, GSAP, Recharts and jsPDF provide the responsive UI, orbital 3D accent, transitions, charts and reports. Express hosts authenticated REST endpoints under `/api/ems/*`; Zod validates mutations. Existing tRPC, OAuth, signed-session verification and server middleware remain in place. Prisma Client is generated from `prisma/schema.prisma`, with additive SQL under `prisma/migrations/`. The Drizzle `users` table retains the starter’s session identity; its role enum is extended with `hr` and `employee`. Every EMS request must have a verified session. The project includes `client/public/manus-routes.json` for the registered routes.

## Development setup

Use Node 22 and pnpm 10.18.0 (the included Dockerfile pins the pnpm toolchain). Copy `.env.example` to `.env`, then set `DATABASE_URL` and any platform OAuth/storage values required by your execution environment. Never commit `.env` or production credentials. On managed Manus hosting, configured platform variables are provided to the application at runtime. Prisma’s helper adds `sslaccept=strict` for TiDB Cloud URLs; the original `DATABASE_URL` remains untouched for the starter’s Drizzle client. Local MySQL/MariaDB URLs are passed through.

```sh
pnpm install
pnpm prisma:generate
pnpm db:migrate          # starter user table and role migration (if not already applied)
pnpm db:ems:migrate      # additive EMS-only tables, tracked separately
pnpm db:seed             # repeatable sample data; updates are deliberately empty
pnpm dev                 # Express + Vite on PORT (default 3000)
```

`db:ems:migrate` runs the checked-in create-only Prisma migration using its own `ems_schema_migrations` ledger. It does not call `prisma db push` or drop the starter’s `__drizzle_migrations` table. `db:ems:push` is retained as an alias to the same safe runner. For a later Prisma schema change, generate and review a create/alter migration first, then update the runner to apply it. Do not use destructive schema-reset commands against the managed database.

The seed uses fictional `example.com` employees and salaries. It uses upserts with empty update sets: rerunning it adds missing seed records without overwriting edited profiles or transactions. The seed only creates its sample leave and activity entries when those collections are empty. The included 10 people, five teams, balances, attendance, sample payroll, goals, review notes and one pending leave record live in the managed MySQL database once seeded.

## Roles and first use

Sign in using the configured Manus OAuth flow. The identity configured as the project owner receives Admin through the starter’s owner policy. Other first-time accounts get the lowest-privilege employee role. An Admin opens **Settings**, assigns `HR` or `Employee`, and can link the signed-in account to a profile. When a profile email matches a signed-in work email it can be found automatically; an explicit settings link takes precedence. Employees see only matched self-records and employee-owned pay/documents. Managers are Admin and HR. Only Admin may manage account roles.

## Quality checks

```sh
pnpm check
pnpm test
pnpm build
```

`pnpm test` includes unit coverage for least-privilege role mapping, HR/Admin boundaries, explicit self-profile scope precedence, leave-balance limits, the custom state-changing-request marker, private-file ownership and real-data zero-filled attendance trends. It also runs the starter’s session-cookie/platform integration checks. Tests do not clear or write to the managed database.

## Deployment

The project is initialized with the managed server and database. The container build is in `Dockerfile`; its build lifecycle generates Prisma Client, bundles the React app and Express server, and serves the `/api/health` readiness endpoint. Keep the project’s existing configured listener and platform runtime variables. Do not put `DATABASE_URL`, `MANUS_API_KEY` or signing secrets in the browser bundle. Published versions are separate from local changes/checkpoints; use the project’s version history and Publish controls for release.

## Security and operational limitations

See [SECURITY.md](./SECURITY.md) for the security report, access matrix, control boundaries and limitations. File deletion is a soft archive because the installed managed-storage helper does not provide a physical object-delete operation. Signed-download URL lifetime is owned by the configured storage provider and is not assumed by the application. Upload type/extension checks do not replace malware scanning; see the report before using documents for sensitive production operations.
