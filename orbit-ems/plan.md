# Orbit EMS — implementation plan

## Product and implementation

Orbit is a full-stack employee-management workspace. It retains the managed web-db-user React/Express/tRPC/Drizzle starter and its real Manus OAuth/session integration. The enabled managed MySQL-compatible database stores EMS records through Prisma; the starter's OAuth identity table remains under Drizzle for compatibility. TiDB Cloud Prisma connections use strict TLS through an isolated URL transformation, without changing Drizzle's source URL.

EMS SQL comes from the Prisma schema as reviewed, additive DDL and is applied idempotently through `ems_schema_migrations`. It preserves the starter's `__drizzle_migrations` history and existing application data. Express REST endpoints expose the modules. Strict Zod payload validation, a mutation-intent header, and server-side verification of the signed session/database role mediate sensitive operations. Role guards distinguish Admin, HR and Employee; compensation, user management, report exports and private file access receive specific checks.

Managed object storage contains document and report bytes. Prisma metadata associates a randomized object key, type, size, owner, uploader and archive time with an authenticated account. The installed storage API can create and sign access but does not physically delete/list objects, so archive is an application-level soft delete. Demo data is additive and non-overwriting.

The frontend uses React, TypeScript, Tailwind CSS, Wouter, Three.js / React Three Fiber, GSAP, Recharts and jsPDF. Existing tRPC and authentication remain available. A custom workspace shell hosts data-backed dashboard and modules; charts and forms use authenticated REST calls. CSV and PDF reports are generated client-side. Express serves the single server runtime and configured health endpoint. Deployment/build must keep platform private credentials out of browser output.

## Project structure

- `client/src/App.tsx` — protected route entry and direct module routes.
- `client/src/components/` — responsive Orbit shell, login screen, 3D orbital scene and shared page primitives.
- `client/src/pages/Home.tsx` — persisted-data dashboard, charts, team composition and activity.
- `client/src/pages/ModulePage.tsx` — validated management tables/forms, filters, review flows and exports for EMS modules.
- `client/src/lib/api.ts` — typed REST helper with the existing session-token Preview fallback.
- `client/src/index.css` — brand tokens, responsive light dashboard, component system and reduced-motion rules.
- `client/public/` — site icon and current `/manus-routes.json` route declaration.
- `server/_core/` — preserve OAuth, session verification, existing application middleware and the `/api/health` endpoint.
- `server/ems.ts` — authenticated, validated REST handlers for EMS domains and private file access.
- `server/ems/` — Prisma client with strict TiDB TLS normalization, explicit-profile-first self-scoping, atomic leave-balance reservation, reusable access policies and `analytics.ts` for seven persisted check-in counts.
- `server/ems/security.test.ts` and `server/ems/analytics.test.ts` — isolated role, profile privacy, leave-boundary, file-access and zero-filled-trend tests.
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` — relational domain schema, create-only migration, and idempotent demo data.
- `scripts/` — TLS-aware Prisma CLI and idempotent custom EMS migration runner.
- `drizzle/schema.ts` and `drizzle/` — preserve auth/session storage and extend existing role values additively.
- `README.md`, `SECURITY.md`, `RESEARCH.md`, `TODO.md` — setup, explicit control/limitation report, reference-based visual design notes and complete acceptance outcomes.

## Design

### Three styles considered

- Repository-inspired bright workspace with graphite navigation and precise hairline dividers — probability 0.06.
- Nocturnal blue glass command console with strong glow on every card — probability 0.05.
- Neo-industrial paper dashboard with orange data accents and editorial typography — probability 0.08.

### Chosen: Repository-inspired bright workspace, with an orbital glass accent

- **Design Movement**: Contemporary enterprise software, using the supplied GitHub repository's disciplined whitespace, compact chrome, light surfaces and hairline separators as a layout cue, without copying its branding or exact interface.
- **Core Principles**: High information clarity; neutral and precise hierarchy; meaningful color only for data/status; restrained spatial depth that never competes with work.
- **Color Philosophy**: A near-white canvas and blue-gray text keep HR workflows legible. Graphite anchors navigation. Orbit's own periwinkle-indgo accent carries selected states and chart emphasis; mint communicates positive status. Lavender only appears as a subtle reflection around the 3D motif.
- **Layout Paradigm**: Compact product bar, narrow fixed desktop rail and a broad workspace of concise panels. On mobile the rail becomes an accessible overlay and panels stack into a single column. Search, workspace context and profile are kept in the top bar.
- **Signature Elements**: A custom looped Orbit glyph; thin-bordered panels with restrained shadow; a slow floating orbital model with small parallax and a static reduced-motion fallback.
- **Interaction Philosophy**: Quiet by default, then crisp on hover/focus. Real data, validation, useful empty states and status feedback take priority over decorative motion. Manager-only controls are hidden when not available, and APIs enforce the same policy.
- **Animation**: GSAP provides short, low-travel content entrances; 3D motion is gentle; charts respond to data. Respect `prefers-reduced-motion` and supply CSS fallback shapes when it applies; the main workflows remain accessible if WebGL is unavailable.
- **Typography System**: Inter/system sans with slightly negative tracking on headings, tabular-feeling strong numeric metrics, and small but legible uppercase labels.
- **Brand Essence**: Employee operations with composure: an approachable, precise home for company people data. Personality: clear, calm, modern.
- **Brand Voice**: Direct, humane, action-oriented. Examples: “Your team, in good orbit.” and “A clear view of what needs attention.”
- **Wordmark & Logo**: Custom lowercase `orbit` wordmark paired with a two-loop orbital symbol drawn in SVG.
- **Signature Brand Color**: Orbit indigo `#6759E8`.

## Scope and delivery constraints

Every business API route requires a verified session. Admin manages permissions; HR administers employee operations; Employees are self-scoped with explicit account/profile assignment taking precedence over the email fallback, and cannot access another person's compensation or documents. Leave approvals reserve the matching allowance atomically, while employees created or applying for a different leave year receive corresponding balances. Dashboard trends are grouped from saved check-in dates and missing days render as zero. Storage uses the configured managed object-storage integration and a persistent SQL metadata index, not local ephemeral files. The storage provider owns signed-link duration and physical object retention. Publishing/checkpoint behavior follows the existing project settings and is not implied by a successful Preview/build.
