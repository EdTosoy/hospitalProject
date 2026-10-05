# Hospital API

NestJS 11 with PostgreSQL 17 via Drizzle ORM and `pg`. Run workspace commands from the repository root. See [the root setup instructions](../../README.md), [migration guidance](../../docs/database-migration.md), and [audit results](../../docs/audit.md).

Useful commands: `pnpm --filter backend dev`, `build`, `prod`, `lint`, `typecheck`, `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:baseline`, and `db:seed`.

`DATABASE_URL` and a `JWT_SECRET` of at least 32 characters are required. Production also requires `CORS_ORIGIN`. The API listens on `PORT` (default 3000), exposes Swagger at `/api`, and has a liveness endpoint at `/health`. Protected routes require `Authorization: Bearer <token>`.

Session cookies/revocation, login limits, exact PHP amounts, transactional audit metadata, and clinical access policies are documented in the [root README](../../README.md#session-and-billing-behavior) and [repair report](../../docs/code-quality-fixes.md). Apply migration 0001 before starting this version; existing users must sign in again.
