# Project: "Pulse" – Unified Hospital Management Architecture

**Type:** Advanced Full-Stack Portfolio Capstone
**Owner:** Solo Developer
**Goal:** Refresh Web Dev Skills & Master Modern Stack

## 1. Tech Stack (Actual)

| Layer    | Tool                                                                  | Usage Rule                                                                                          |
| :------- | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router, Turbopack) + TypeScript                       | Server Components default                                                                           |
| Styling  | Tailwind CSS v4 + shadcn/ui (Radix primitives + `cva`)                | Use standard tokens                                                                                 |
| State    | TanStack Query v5 + Zustand v5                                        | Server state vs Client state separation                                                             |
| Forms    | React Hook Form + Zod v4 (`@hookform/resolvers`)                      | Frontend validation only                                                                            |
| Backend  | NestJS + TypeScript                                                   | DTO validation via `class-validator`/`class-transformer` (not Zod)                                  |
| ORM      | Prisma 7 (`@prisma/adapter-pg` driver adapter, no Rust engine binary) | See §6a — currently schema-push, not migration-driven                                               |
| Auth     | JWT + Passport.js                                                     | RBAC Guards on ALL routes                                                                           |
| DB       | PostgreSQL                                                            | Local: Docker container. Prod: Supabase                                                             |
| Monorepo | Turborepo + pnpm workspaces (`apps/*`, `packages/*`)                  | `@hospital/shared`, `@hospital/ui` workspace packages (currently unused by backend/frontend source) |
| Deploy   | Coolify (self-hosted), Docker Hub image registry                      | See §8                                                                                              |

## 2. Core Modules Structure (NestJS)

```
src/
├── auth/           # JWT + Passport guards (DONE)
├── users/          # User CRUD + role assignment (DONE)
├── patients/       # Patient profiles (DONE)
├── appointments/   # RMC booking/cancel (DONE)
├── queue/          # RMC queue management (DONE)
├── consult-notes/  # SOAP notes (Doctor) (DONE)
├── billing/         # Read-only charges view (DONE)
└── prisma/          # PrismaService (adapter-pg driver) (DONE)
```

All modules listed above exist in the codebase with controller/service/DTO layers in place.

## 3. Sitemap (Phase 1 Scope)

**Patient Portal (4 Pages)**

- `/login` – JWT auth
- `/register` – Patient signup
- `/appointments` – Book/cancel RMC
- `/history` – View past visits

**Staff Portal (6 Pages)**

- `/staff/login` – Role-based auth
- `/staff/dashboard` – Role-specific home
- `/staff/queue` – RMC queue (Front Desk)
- `/staff/patients` – Patient list (Doctor/Nurse)
- `/staff/consult` – Notes entry (Doctor)
- `/staff/billing` – Charges view (Billing)

> Status of frontend page implementation not yet audited against this sitemap — TODO: verify which of these 10 routes actually exist under `apps/frontend/src`.

## 4. RBAC Roles Scope (Phase 1)

| Role           | Permissions                             |
| :------------- | :-------------------------------------- |
| **Patient**    | View/Edit ONLY their own record.        |
| **Doctor**     | View all patients, write consult notes. |
| **Nurse**      | View patients, triage/vitals entry.     |
| **Front Desk** | Register patients, manage Queue.        |
| **Billing**    | Read-only charges view.                 |

## 5. Actual Status (supersedes original Daily Execution Plan)

### Backend — DONE

- Auth module: JWT strategy, login/register, `@Roles` guard.
- Users, Patients, Appointments, Queue, Billing, Consult Notes modules: full CRUD/service/controller/DTO layers present.
- Prisma schema covers all core models: `User`, `Patient`, `Appointment`, `Queue`, `ConsultNote`, `Billing`, `AuditLog`.
- Prisma 7 migrated to driver-adapter model (`@prisma/adapter-pg` + `pg`), removing the old Rust query-engine binary dependency.

### Frontend — IN PROGRESS

- Next.js 16 scaffolded with TanStack Query, Zustand, shadcn/ui component primitives, React Hook Form + Zod.
- Page-by-page completion against the §3 sitemap not yet verified — needs an audit pass.

### Infrastructure — DONE (needs hardening, see §6a and §8)

- Local dev: `docker-compose.dev.yml` runs Postgres in Docker.
- Production build: `Dockerfile.backend`, `Dockerfile.frontend` (multi-stage, pnpm + Turborepo build, prisma generate baked in at build time via `DATABASE_URL` build-arg).
- Production deploy: `docker-compose.yml` (root) — Coolify-based, pulls pre-built images from Docker Hub (`edtosoy/hospital-backend:latest`, `edtosoy/hospital-frontend:latest`), points at Supabase for `DATABASE_URL`.

### Outstanding TODOs before this is deploy-ready

- [ ] **Migrations**: currently using `prisma db push` against a schema with no committed migration history (`prisma/migrations` is gitignored). Fine for local prototyping, **not safe for a real deploy** — need to run `prisma migrate dev` locally to generate a baseline migration, commit it, and switch prod deploys to `prisma migrate deploy`. Do this before pointing at the real Supabase DB.
- [ ] Audit frontend routes against the §3 sitemap — confirm all 10 pages exist and are wired to real endpoints.
- [ ] Decide whether `@hospital/shared` / `@hospital/ui` workspace packages get used, or removed if staying dead code (currently declared as deps but unreferenced in backend/frontend `src`).
- [ ] `Dockerfile.backend` runner stage doesn't copy `packages/shared` — will break at runtime if `@hospital/shared` is ever imported by backend source without also updating the Dockerfile.
- [ ] Confirm Coolify's expected compose filename before any renaming of `docker-compose.yml` → `docker-compose.prod.yml`.

## 6. Data Schema Strategy (Prisma)

To keep the learning curve manageable and "Phase 1" realistic:

- **User vs Patient:**
  - **Decision:** 1:1 Relationship.
  - **Why:** Simplifies Auth. Every "Patient User" has exactly one "Patient Profile".
  - **Fields:** `dob`, `phone`, `gender` live on `Patient`, not `User`.

- **Appointments:**
  - **Lifecycle:** `PENDING` -> `CONFIRMED` -> `COMPLETED` / `CANCELLED`.
  - **Fields:** `dateTime`, `reason`, `status`.

- **Queue (RMC):**
  - **Logic:** Daily reset (not yet enforced in code — TODO).
  - **Fields:** `queueNumber` (Int, auto-incrementing per day), `status` (`WAITING`, `CALLED`, `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`).
  - Note: original plan specified a `ticketNumber` string field (e.g. "A-101") and a `SERVING`/`DONE` status set — actual schema uses an `Int` `queueNumber` and a 5-state enum instead. Documenting actual schema, not original intent.

- **Audit Logging (Privacy Compliance):**
  - **Requirement:** Track every "View" action by staff.
  - **Table:** `AuditLog` (`actorId`, `action`, `resourceId`, `timestamp`).
  - Status: table exists in schema — TODO confirm it's actually being written to from service layers, not just modeled.

### 6a. Migrations — Known Gap

`prisma/migrations` is excluded via `.gitignore`. All schema changes so far have been applied with `prisma db push`, which is fine for solo local iteration but means there's no auditable migration history and no safe path to `prisma migrate deploy` in production yet. **Action item:** before the first real Coolify deploy against Supabase, run `prisma migrate dev --name init` locally against a disposable DB to generate a baseline migration, commit `prisma/migrations`, then switch the deploy process to `prisma migrate deploy`.

## 7. Deployment Architecture (Actual)

```
Dockerfile.backend  ──build──▶ edtosoy/hospital-backend:latest  ──push──▶ Docker Hub
Dockerfile.frontend ──build──▶ edtosoy/hospital-frontend:latest ──push──▶ Docker Hub
                                              │
                                              ▼
                    docker-compose.yml (root) ──pulls both images, wires env vars
                                              │
                                              ▼
                                          Coolify deploys this
```

- Backend image build requires `DATABASE_URL` as a build-arg (Prisma 7's config loader needs it resolvable at `prisma generate` time, even though the actual runtime connection also reads `DATABASE_URL` separately from the container's env).
- Frontend image build requires `NEXT_PUBLIC_API_URL` as a build-arg (baked into the client bundle at build time, since it's a `NEXT_PUBLIC_*` var — cannot be swapped at runtime like the backend's env vars).
- Local dev never touches these Dockerfiles — `pnpm dev` runs both apps from source via Turborepo, against the local Docker Postgres in `docker-compose.dev.yml`.

## 8. Success Metrics

- **Uptime:** Zero crashes on invalid input (DTO validation via `class-validator` on backend, Zod on frontend forms).
- **Security:** A Patient `POST`ing to `/appointments` cannot book for another user ID.
- **Completeness:** 10 core screens functional (pending audit — see §5 TODOs).
- **Deploy safety:** No production deploy against real Supabase data until the migrations gap (§6a) is closed.
