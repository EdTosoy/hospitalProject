# Pulse Medical Center

A hospital workflow application: Next.js 16 / React 19 frontend, NestJS 11 API, PostgreSQL 17, and Drizzle ORM. The pnpm 9 workspace uses Turbo for application builds and development. No cloud account is needed for the local baseline.

## Local development

Prerequisites: Node.js 22.13+ (22 LTS recommended), pnpm **9.0.0**, Docker with Compose. Commands below run from the repository root. Run package managers as your normal user.

```sh
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Replace the example database password consistently in `.env` and `apps/backend/.env`; percent-encode reserved characters in connection URLs. Set a random `JWT_SECRET` of at least 32 characters in the backend environment. Example values are local placeholders, never production credentials. Configure `SEED_PASSWORD` for optional demo users.

```sh
docker compose up -d database
pnpm --filter backend db:migrate
pnpm --filter backend db:seed
pnpm dev
```

Frontend: http://localhost:3001. Backend: http://localhost:3000. Interactive API documentation: http://localhost:3000/api. The database is exposed only on loopback port 15432. The frontend's browser API URL must resolve **from your browser**, not to Docker's internal `database` or `backend` hostnames.

Demo accounts: `admin@hospital.com`, `doctor@hospital.com`, `nurse@hospital.com`, `frontdesk@hospital.com`, `billing@hospital.com`, `patient@hospital.com`, all using your configured `SEED_PASSWORD`. The seed inserts missing demo users and a linked patient profile without deleting records or changing existing passwords. It refuses production mode. Public registration always creates a patient account; staff accounts require an authenticated admin API request or the local demo seed.

A new patient registers, signs in, completes the patient profile, and books an appointment. Staff can register walk-ins, book for a selected patient, add patients to the queue, call the next patient, and complete a visit. Doctors confirm appointments and write SOAP notes. Billing staff and admins create bills and mark them paid.

## Production builds locally

```sh
pnpm build
pnpm --filter backend prod
# In another terminal:
pnpm --filter frontend start
```

The frontend start command uses the standalone Next.js server and copies its static assets. It defaults to port 3001; `PORT` overrides it. Backend defaults to port 3000. Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and comma-separated `CORS_ORIGIN` appropriately. Apply database migrations before starting the API. Builds do not require a database connection or database credentials.

## Session and billing behavior

Login sets a one-hour HttpOnly cookie (`Secure` in production, `SameSite=Lax`); `/auth/me` restores identity and `/auth/logout` revokes the session and clears the cookie. API clients can still use the returned bearer token; logout revokes that token too. Tokens issued before the session migration no longer authenticate: sign in again. Cookie-authenticated writes require an exact allowed `Origin`; browser login also rejects unapproved origins. Login and registration are limited to 20 requests per minute per route/IP within each API process.

Production needs HTTPS and frontend/API URLs on the same site. `CORS_ORIGIN` must exactly match the frontend origin. A plain HTTP remote deployment cannot use production Secure cookies. Do not relax these controls to make an insecure public setup work. Local localhost development uses the documented ports; production Compose on localhost depends on the browser's localhost Secure-cookie exception.

New bills use PHP with at most two decimal places and a maximum of PHP 9,999,999,999.99. Pending and overdue charges can be paid. Outstanding totals sum exact centavos and exclude legacy bills with unconfirmed currency. Open **Review legacy bill** to enter the agreed PHP amount explicitly; the original amount remains unchanged. Paid charges cannot be repriced/reopened/deleted; use a separate adjustment charge. A legacy paid bill can undergo this explicit one-time review without changing its original payment timestamp. Billing records payments received; it does not process payments.

See [the code-quality repair report](docs/code-quality-fixes.md) for verified fixes and operational limits.

## Docker baseline

```sh
cp .env.example .env
# Configure database values, JWT_SECRET, and optional pgAdmin credentials.
docker compose up --build -d
```

Compose waits for PostgreSQL health, runs migrations as a separate one-shot service, then starts the API on http://localhost:8080 and frontend on http://localhost:3000. Optional pgAdmin: `docker compose --profile tools up -d pgadmin`, available on loopback port 15433. Configure its connection using your database user, host `database`, port 5432.

The Compose connection URL is constructed from the database variables. Choose a URL-safe local `POSTGRES_PASSWORD` (letters, digits, underscores, and hyphens); independently configured connection URLs must percent-encode reserved characters. For a remote browser, rebuild with a browser-reachable `NEXT_PUBLIC_API_URL` and set `CORS_ORIGIN` to the actual frontend origin.

To seed the Docker database locally, explicitly opt into development mode and pass a chosen demo password:

```sh
docker compose run --rm -e NODE_ENV=development -e SEED_PASSWORD=choose-a-local-demo-password backend node dist/src/database/seed.js
```

`docker compose down` stops services while preserving the named database volume. Do not use `down -v` against data you need. An existing PostgreSQL volume retains its original database credentials; editing environment variables does not change them.

## Database lifecycle

Drizzle definitions: `apps/backend/src/database/schema.ts`. SQL migrations and snapshots: `apps/backend/drizzle`. The database service uses the existing `pg` connection pool. IDs remain text containing application-generated UUIDs; timestamps remain millisecond-precision timestamps without time zone. `updatedAt` remains application-managed. Billing preserves the original double-precision `amount` column and adds exact integer `amountMinor` (centavos) plus PHP `currency`. New bills use exact money; legacy bills require explicit staff review without silently rounding or assigning currency. The additive migration also creates revocable sessions.

```sh
pnpm --filter backend db:generate  # Generate SQL after a schema change; inspect it.
pnpm --filter backend db:migrate   # Apply repository SQL, never reset the database.
```

**Existing development databases:** back up first. Do not apply the fresh schema migration over pre-existing application tables. Use `pnpm --filter backend db:baseline` against a backed-up development copy first. It compares columns, types, nullability, defaults, enum values/order, primary/unique keys, and foreign-key actions against the initial migration. On an exact semantic match it only records the baseline in Drizzle's migration journal. It does not replace or delete application data. A mismatch rolls back and requires investigation; do not force an adoption. Then run `db:migrate`. See [the migration plan](docs/database-migration.md).

## Verification

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Integration and browser tests require a **dedicated migrated test database**, with `test` in its database name. The migration lifecycle suite additionally requires a database role with `CREATEDB`; the default local PostgreSQL container user and CI service user have this privilege. Tests add uniquely named fixtures and never truncate existing application tables. Migration tests create isolated databases and leave them available for inspection. Browser tests also seed demo staff accounts; use a newly created dedicated database for predictable queue state. For example, create `hospital_test` in your local PostgreSQL container, configure the shell's `DATABASE_URL` to that database, then:

```sh
pnpm --filter backend db:migrate
pnpm --filter backend test:e2e
pnpm --filter frontend exec playwright install chromium
pnpm build
pnpm --filter frontend test:e2e
```

The browser harness starts both production builds on ports 3000/3001 and requires those ports to be free. On standard Linux, Playwright may require browser OS dependencies; use its supported installation instructions. On NixOS, use a Nix-provided Chromium with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium`. Biome's downloaded Linux executable may require Nix's dynamic loader; this environment-specific workaround is documented in [the audit report](docs/audit.md).

CI runs dependency installation, formatting, lint, types, unit tests, PostgreSQL integration tests, production builds, browser flows, and Docker builds. Cloud image publishing is a separate manually triggered workflow; deployment additionally requires its `deploy` input and `production` environment. It has not been executed for this audit.

## Architecture and limitations

The browser calls the Nest API with an HttpOnly session cookie; credentials are never persisted in localStorage. React Query owns server state; Zustand holds user identity in memory and restores it through `/auth/me` after reload. Nest's JWT strategy validates token expiry, a database-backed session, and the user's current role from PostgreSQL; guards enforce role restrictions and services enforce patient ownership and note authorship. Drizzle queries return safe user projections. Queue numbering uses a transaction advisory lock; call-next locks a waiting row with `SKIP LOCKED`. Socket.IO emits refresh hints after session validation. The UI uses authoritative HTTP queries with five-second foreground polling and focus refresh for queue, scheduling, patient lists, and billing. Appointment claims and transitions are row-locked; terminal visits cannot be rewritten or deleted. Queue transitions cannot move backwards.

Eight tables: User, Patient, Appointment, Queue, ConsultNote, Billing, AuditLog, Session. Sensitive application mutations and login/logout write actor/action/resource/field metadata transactionally, excluding clinical text and credentials. Doctors, nurses, and admins keep shared clinical reads; billing receives only patient IDs/names and cannot access clinical routes. Prescriptions, labs, doctor availability, and payment gateways are not implemented. This is a demonstrable local baseline, not production clinical software. [The engineering audit](docs/audit.md) records verified behavior, remaining security work, and infrastructure limits.

Terraform, kubeadm/Ansible, Kubernetes manifests, ECR and monitoring assets remain in their existing directories. They describe a single EC2-hosted cluster and require operator configuration. No cloud resources were created, changed, or deployed. Do not run bootstrap or synchronization scripts without reviewing their system and cloud effects.

Kubernetes bootstrap now requires `CORS_ORIGIN` as well as the existing AWS/database/JWT variables. Replace historical image tags with newly built Drizzle-capable images before deploying; the API deployment's migration init container must use the same backend image. These assets were statically reviewed but no live cluster rollout was verified.
