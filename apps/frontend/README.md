# Pulse frontend

Next.js 16 App Router, React 19, Tailwind 4, Radix primitives, React Hook Form/Zod, React Query, and Zustand. The interface uses shared navigation, form controls, status indicators, and role-specific workflows. Real patient, doctor, staff, admin, and billing workflows use the NestJS API.

See [root setup](../../README.md) and [the audit](../../docs/audit.md). Development and local standalone production servers default to http://localhost:3001. Set `NEXT_PUBLIC_API_URL` before building; it is a browser-visible, build-time value.

Commands from the root: `pnpm --filter frontend dev`, `build`, `start`, `lint`, `format:check`, `typecheck`, and `test:e2e`. Browser tests start both applications and require a dedicated migrated PostgreSQL test database.

See [UI/UX decisions and verification](../../docs/ui-ux.md) for the redesign, responsive browser checks, and known product limitations.

Browser authentication uses HttpOnly cookies with in-memory user identity and `/auth/me` restoration. Frontend/API must share a site; production requires HTTPS and matching `CORS_ORIGIN`. Queue/scheduling/billing refresh every five seconds while visible. Billing uses PHP and includes an explicit legacy-currency review form. See the [quality repairs](../../docs/code-quality-fixes.md).
