# Verification gates

Inspected for the P0 engineering baseline; command definitions are not passing
test results. Package manager: `pnpm@9.0.0`; verify CI uses Node 22 and pnpm 9.

| Gate              | Existing command                   | Scope / prerequisite                                                                                                        |
| ----------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Types             | `pnpm typecheck`                   | Backend and frontend TypeScript                                                                                             |
| Static analysis   | `pnpm lint`                        | Turbo: backend ESLint and frontend Biome                                                                                    |
| Formatting        | `pnpm format:check`                | Backend Prettier source/tests and frontend Biome; not all Markdown docs                                                     |
| Units             | `pnpm test`                        | Backend Jest with runInBand; not frontend or database E2E                                                                   |
| Build             | `pnpm build`                       | Turbo backend/frontend builds; produces artifacts                                                                           |
| Migrations        | `pnpm --filter backend db:migrate` | Mutates the selected PostgreSQL database; dedicated test target only                                                        |
| Real database/API | `pnpm --filter backend test:e2e`   | Jest application/quality/migration tests; dedicated test database and a role with CREATEDB for migration lifecycle fixtures |
| Browser journeys  | `pnpm --filter frontend test:e2e`  | Playwright; backend/frontend must be built; starts and seeds the test backend and starts frontend                           |

`DATABASE_URL` must identify a dedicated database with `test` in its name for
migration lifecycle and browser tests. This name guard is not a full security
boundary: verify the host/account/role too. The migration suite checks empty and
legacy schemas and invalid migration history; it creates/drops its own fixture
databases. That lifecycle needs deliberate authorization. Never run seed,
baseline, migrations, or E2E against production or shared development data.

The verify workflow uses PostgreSQL 17, installs the frozen lockfile, and runs
format, lint, types, backend unit tests, test migrations, backend E2E, build,
Playwright/browser E2E, and both Docker image builds. Its Ubuntu Playwright
installation command is a CI prerequisite, not a NixOS host installation recipe.
The separate deploy workflow is not a verification command or authorization to
deploy. This inventory does not establish a current remote CI pass.

Existing security checks include authorization/application tests and database
constraints. Verify CI has no dedicated dependency-audit or full accessibility
gate. Backend E2E and browser checks are distinct from `pnpm test`; keep both
when behavior crosses the real API/database boundary. No dedicated concurrency
or retry package script is present; select/add meaningful cases only for affected
invariants during feature/bug work.

Use the relevant subset; record exact commands and PASS, FAIL, SKIPPED, or NOT RUN.
Missing services, browser, or test credentials are NOT RUN. Do not dump dotenv
files, log credentials/patient data, install prerequisites, or weaken tests merely
to make a gate pass. Preserve unrelated edits.

## P1 local evidence

The workflow retains its existing checks and now has a 30-minute job timeout and
a failure-only upload of `apps/frontend/test-results/` (seven-day retention).
Existing Playwright retains failure traces and captures responsive screenshots.
Workflow YAML parsed locally; hosted artifact delivery is NOT RUN.

Backend units passed: 15 suites / 19 tests, using the already-installed binary:
`node node_modules/jest/bin/jest.js --runInBand` from `apps/backend`. Running that
binary from the monorepo root misses the backend's ts-jest/package configuration
and fails before tests execute; use the package directory. The normal pinned
pnpm 9 command remains the project gate. Local Node was 24; CI uses Node 22.

Installed Playwright is 1.56.1, requiring revision 1194 (Chromium 141.0.7390.37).
The cached browser failed dependency validation on NixOS. The existing override
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pointing to Nix Chromium 153.0.8010.52 passed
launch/DOM/screenshot/trace probes with Chromium sandbox enabled. This is an
observed host fallback, not the pinned browser pair. Real six-role/database E2E
and migration tests are NOT RUN under P1's no-destructive-database constraint.

## Phase 1A repair and verification

Completed local verification on 2026-10-25. The existing Phase 1A work repairs:

- Paid legacy bill review accepts only explicit amount/PHP confirmation, preserves
  the original amount and payment history, and permits identical confirmation
  retries after concurrent review.
- Note and bill writes validate their appointment inside the audited transaction
  while holding a SHARE row lock. Appointment reassignment/deletion holds UPDATE
  and rejects incompatible linked records. The existing unique constraint permits
  only one consultation note per appointment.
- Completed/no-show queue entries reject deletion without changing history or
  appending a successful-mutation audit entry.
- Patient create/update trims required demographic text, applies length bounds,
  and rejects invalid/future birth dates. International names/contact formats and
  unrelated updates to legacy records remain supported.
- New birth dates retain their supplied calendar component at UTC midnight.
  Patient directory, consultation, and profile displays format that component in
  UTC; existing stored timestamps are not migrated. The future-date boundary is
  explicitly UTC in both client and server validation.
- Dependency versions/overrides and the lockfile are updated; CI now includes
  `pnpm audit --prod --audit-level=high`. Browser test ports can be selected with
  `HOSPITAL_TEST_API_PORT` and `HOSPITAL_TEST_WEB_PORT`; the frontend build must use
  the corresponding `NEXT_PUBLIC_API_URL`.

The preserved before-repair logs reproduce invalid paid legacy edits, appointment
link/deletion failures, closed queue deletion, invalid demographics, and the
Los Angeles birth-date display shift. No additional application repair was needed
during the resumed verification. A proposed multiple-note-author scenario was
rejected by the existing database unique constraint; no change was retained for it.

| Check | Result and evidence |
| --- | --- |
| `pnpm typecheck` using pinned pnpm 9 on PATH | **PASS** on resume: backend and frontend |
| `node node_modules/jest/bin/jest.js --runInBand` from `apps/backend` | **PASS** on resume: 17 suites / 32 tests, including compressed-body parser availability and birth-date validation |
| `pnpm --filter backend lint` | **PASS** on resume |
| `pnpm format:check` | Backend Prettier **PASS**; frontend invocation **FAIL** because NixOS cannot directly execute the downloaded Biome binary |
| `pnpm lint` | **FAIL** at frontend Biome startup for the same host limitation; backend lint was then completed separately |
| Installed Biome 2.2.0 `check`, invoked through the Nix dynamic loader from `apps/frontend` | **PASS** on resume: 72 files, no errors or formatting changes; existing sidebar preference-cookie warning remains |
| `pnpm --filter backend exec jest --config test/jest-e2e.json --runInBand phase1a` | **PASS**, preserved earlier evidence: 22 PostgreSQL regressions, including both lock orderings for child creation versus parent reassignment/deletion |
| `pnpm --filter backend test:e2e` | **PASS**, preserved earlier evidence: 4 suites / 42 tests; includes migration lifecycle coverage |
| `pnpm build` | **PASS**, preserved earlier evidence: both packages, 15 frontend routes; application sources unchanged since that build |
| `pnpm audit --prod --json` | **PASS**, preserved earlier evidence: zero advisories; not a newly fetched audit on resume |
| `pnpm --filter backend db:migrate` against the recreated disposable browser fixture | **PASS** on resume |
| `pnpm --filter frontend test:e2e` | **PASS** on resume: 8 tests in 58.7 seconds; Manila/UTC/Los Angeles DOB displays and edit values, image optimizer rejection/availability, independent staff sessions, legacy/overdue billing, cookie sessions, all six roles, keyboard interaction, and 320/390/768/1280 layouts |
| Screenshot inspection | **PASS** on resume: consultation at 390px and expanded patient directory at 1280px; synthetic data only, saved under `apps/frontend/test-results/` |
| Hosted CI and Docker image builds for this Phase 1A change | **NOT RUN** on resume; historical image evidence does not verify the updated dependency versions |

The private local runner `/tmp/hospital-phase1a-ae3dee2a2e/run.py` supplies test
configuration without printing credentials and retains redacted logs. It verifies
the Docker fixture's disposable label, absence of persistent mounts, tmpfs data
directory, database names, role, and current container address before execution.
The stopped fixture was restarted and its temporary browser database recreated;
no shared development or production database was used. The full passing browser
run is recorded in `browser-after.log` alongside the preserved earlier evidence.

The initial sandboxed parser run failed because its loopback server could not
start; it passed with local server access. The globally selected pnpm also failed
before checks started; the existing Corepack wrapper selects repository-pinned
pnpm 9 for package scripts. Browser verification used Playwright 1.56.1 with local
Chromium 153.0.8010.52 and its sandbox enabled, not Playwright's pinned Chromium
revision. Local Node is 24.21.0; hosted Node 22 remains unverified for this change.
No commit, push, publication, deployment, or cloud operation was performed.
