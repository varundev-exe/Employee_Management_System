# Orbit EMS — security report

**Scope:** project source and managed development database as implemented. This is an engineering control summary, not a penetration-test attestation or independent audit. The demonstration database contains fictional sample employees (`example.com`) and illustrative compensation values; replace or remove demo records before any real-company rollout.

## Data and trust boundaries

Orbit processes work identities, employee profile/contact data, role assignments, attendance, leave reasons, salary/payroll, performance notes and uploaded documents. Browser input is untrusted. OAuth and session verification, role selection, database operations, and storage credentials remain server-side. File bodies move from the browser to an authenticated Express upload endpoint, then from the server to the platform-managed object-storage API. The browser is only given a download URL after the server authorizes the metadata record.

## Controls implemented

| Area | Implemented control |
|---|---|
| Authentication | Reuses the starter’s real Manus OAuth flow and signed application session. EMS routes call the starter’s server-side session verifier; no client-supplied role is trusted. The existing app-session cookie is HTTP-only, Secure, and configured for the public HTTPS Preview embedding flow. REST uses the starter’s bearer fallback where the Preview host provides it. |
| Authorization | Every `/api/ems/*` route requires a verified signed-in identity. The persisted database role maps only `admin` and `hr` to manager privileges; unknown/default roles fail to Employee. HR/Admin manage people and HR operations. Settings and permission changes are Admin-only. Employees’ profile, attendance, leave, performance, payroll and file queries are scoped to their linked profile. Employee serialization removes salary fields. |
| State changes | REST mutations require the app’s non-simple `X-Orbit-Request: 1` header in addition to the signed session, reducing cross-site form/CSRF exposure. The browser sends it for mutating calls. CORS is not opened by this feature. |
| Validation | Zod object schemas reject unknown fields and validate form values, status transitions, numeric amounts, role assignments, dates and identifiers. Uploads have a 10 MB server-side limit and an allow-list with extension/MIME matching. Prisma database uniqueness and foreign-key constraints protect relationship integrity. |
| Database | Existing Drizzle OAuth user data is retained. `hr` and `employee` are additive role values. EMS tables live in a separately named namespace and use an isolated `ems_schema_migrations` ledger. The migration is create/alter-only; no data-reset step is part of migration or seeding. TiDB Cloud Prisma connects with strict TLS certificate acceptance. |
| Sensitive modules | Employees cannot read another employee’s payroll or salary. Non-managers can retrieve only files tied to their employee profile or uploads they own. Report documents are manager-only; employee exports are stored as profile-owned documents. Leave approval uses an atomic pending-only update and increments a matching balance once. |
| Object storage | Upload/download calls use the starter’s private server-side storage credentials. Randomized object keys are indexed in MySQL with filename, MIME type, byte size, owner, category, uploader and archive time. Signed-download URLs are returned only after record-level permission checks and are not written to application records or public assets. Soft deletion removes a document from all app queries and prevents a new signed link from being requested. |
| Activity | Material HR changes and storage actions produce recent activity rows; employee dashboard activity is scoped to that employee’s own actions. |

## Access matrix

| Capability | Admin | HR | Employee |
|---|:---:|:---:|:---:|
| Dashboard and team aggregates | Yes | Yes | Yes, aggregate-only |
| Employee records and department changes | Yes | Yes | Own profile only; no mutations |
| Leave requests | Review | Review | Create/view own |
| Attendance | Organization | Organization | Check-in/out and view own |
| Payroll records | Organization | Organization | Own payroll records only |
| Goals and performance reviews | Organization | Organization | Own goals/reviews; progress on own goals |
| Organization reports | Export/share | Export/share | Aggregate export, stored privately on own profile |
| Employee documents | Organization | Organization | Own profile or own upload only |
| User roles, profile links and settings | Manage | No | No |

## Residual risks and limits

- This is not an independent security audit. The implementation has policy unit tests and application checks, but no third-party penetration test or formal threat-model review.
- The starter’s managed object-storage helper has no physical-delete call. Archive is application-level soft deletion; object bytes may remain in managed storage after archive. A production retention/erasure requirement needs a provider-supported deletion/retention workflow before use.
- Upload filename/MIME/extension/size checks are not malware scanning, file-content signature inspection, DLP, or content sanitization. Do not assume uploaded Office/PDF files are clean.
- The storage helper obtains a provider-signed URL but does not expose a configurable TTL in its contract. The app does not assert an expiry duration; avoid logging or sharing returned links.
- The database and storage services are managed platform dependencies. This source does not add application-layer field encryption, custom database backup policy, key rotation, or independent storage replication. Confirm the provider’s service settings and contractual controls before production use.
- Role assignment is intentionally powerful and depends on the project owner’s existing OAuth identity being configured correctly. Protect that identity and maintain at least one trusted Admin account.
- When no explicit account/profile link exists, the app can match the signed-in account email to a profile. An explicit Admin-managed profile assignment takes precedence and scopes the account to that one employee only. Use organization-controlled work addresses and review identity links.
- The app records operational actions, not a tamper-evident compliance audit ledger. Restrict database access and provision external immutable audit retention if regulation requires it.
- Local setup requires authenticated platform/OAuth/storage configuration to match the intended runtime. A local static server does not create an alternate demo-auth bypass.

## Operational guidance

Keep credentials in managed secret/runtime configuration, never source control or Vite client values. Run only reviewed additive migrations on the shared managed database; `prisma db push` is deliberately not the production EMS migration command. Use the included `pnpm check`, `pnpm test` and `pnpm build` before release. Change Admin/HR permissions through the protected Settings flow, remove demo records before real use, and validate the deployed OAuth, database TLS, storage ownership and backup/retention settings with the responsible platform/security team.
