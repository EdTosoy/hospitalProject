# Code-quality repair report

Scope: the authorized frontend-to-backend repairs following [the historical audit](code-quality.md), on top of the existing Drizzle baseline and UI redesign. User decisions: PHP billing; retain shared clinical reads for doctors/nurses/admins; give billing only patient IDs and names. Existing working-tree changes and all legacy financial values were preserved. No commit, push, deployment, cloud change, database reset, table truncation, or volume deletion was performed.

## What was broken and why

| Problem | Root cause |
| --- | --- |
| Two doctors could both claim the same visit | Permission/assignment checks read outside a transaction, followed by unconditional writes |
| Patients could cancel completed visits; terminal states could be reopened | Server checked the requested status without enforcing the current state's transitions |
| A mounted queue missed changes from other staff | Local cache invalidation was the only refresh trigger; staleTime did not schedule refreshes |
| Space-only reasons and empty SOAP records were accepted | Frontend validation had no equivalent server content rule |
| Overdue bills lacked payment/filter actions and disappeared from outstanding totals | UI implemented only part of the backend enum and used unrestricted strings |
| Fractional-cent values were accepted and currency was unknown | Double precision amount with no exact-money or currency contract |
| Sensitive mutations wrote no audit records | AuditLog existed only as a table; mutations did not append entries |
| Billing could see full demographics, including through appointments | Broad authenticated reads and full relation projections |
| Browser JWT persisted in localStorage; logout did not revoke it; login was unbounded | Client-only session lifecycle, stateless token validation, no login limiter |
| Request shapes were derived from response objects; nullable note types were wrong | Shared contracts omitted billing/notes and allowed server-managed fields into write types |

Before fixing these paths, executed six PostgreSQL regression tests: all six failed with the reproduced behaviors. They now pass alongside the expanded regression coverage.

## Changes made

- Appointments lock the row, then validate ownership and current status in the transaction. Pending visits can confirm/cancel/no-show; confirmed visits can complete/cancel/no-show. Terminal visits cannot be edited, reopened, or deleted. Only one doctor can claim an unassigned visit.
- Queue mutations retain advisory locking/skip-locked calling, add authoritative row locks for updates, reject backward/terminal rewrites and empty patches, and remain audited. Adding a new visit remains the path for a returning patient.
- Server trims appointment reasons and billing descriptions, rejects blank reasons/descriptions, and requires at least one nonblank SOAP section on creation and merged updates. SOAP updates lock the row before checking merged content. Empty appointment, queue, patient, account, bill and note updates receive understandable validation errors.
- Billing shares all four statuses. Pending and overdue charges have payment actions, filtering and outstanding totals. Payment retries preserve paidAt; reviewed paid bills cannot be repriced/reopened/deleted, and cancelled bills cannot reopen.
- Additive Drizzle migration 0001 introduces nullable integer centavos/PHP currency and a database CHECK constraint, plus the Session table and user/expiry indexes. New bills validate two-decimal precision and bounded nonnegative amounts. Existing double precision amounts are never automatically changed or assigned a currency. The API exposes exact normalized amount, original legacyAmount and requiresReview; the UI requires explicit staff confirmation before changing legacy bills. Legacy paid review preserves paidAt. Initial Drizzle migration/adoption tooling and original relationships remain intact.
- Mutation audit metadata is transactionally appended for patient, appointment, queue, SOAP, billing and account operations, plus login/logout. Entries include actor, action, resource, resource ID and changed field names. No clinical text, passwords or tokens are copied into logs. Audit insertion failure rolls back the record change. Existing restrictive audit actor foreign keys preserve account attribution; deleting an account with audit history is blocked rather than erasing that history.
- Doctors/nurses/admins retain shared consultation reads. Billing patient selectors and nested billing patient objects return only ID/firstName/lastName. Billing cannot access patient detail, appointments, queue or SOAP routes. Frontend route policy matches that restriction.
- Browser authentication uses one-hour HttpOnly cookies, Secure in production and SameSite=Lax. Browser storage no longer persists credentials or user data; /auth/me restores current identity after reload. Logout deletes the corresponding database session and clears the cookie; replayed cookies and bearer tokens fail. API bearer clients remain supported. Old sessionless JWTs require a new login. Cookie-authenticated writes require an allowed Origin; browser login rejects unapproved origins.
- Installed Nest's existing ecosystem rate limiter, @nestjs/throttler 6, to guard login/registration at 20 requests/minute per route/IP per API process. Password inputs are bounded to 72 UTF-8 bytes to avoid bcrypt truncation. The socket gateway checks current database sessions before accepting new connections.
- Queue, appointments, billing and patient-list queries poll every five foreground seconds and refresh on focus. Queue/scheduling have manual refresh and last-update indicators; billing explains refresh/review state. Permanent API errors are not automatically retried. Session verification outages show retry feedback; logout failures remain visible.
- Shared explicit patient/appointment/SOAP/billing write contracts replace response-derived inputs; note nullability and billing statuses are correct. Controllers use AuthenticatedRequest and backend noImplicitAny is enabled. Unexpected errors log sanitized method/route/type/database-code metadata with a matching X-Request-Id; raw SQL, request bodies and credentials remain excluded.
- Added PostgreSQL business/security regressions and browser tests for independent sessions, exact/legacy PHP billing, overdue payment and cookie privacy/reload/logout. The legacy migration digest still compares every original field; additive columns are asserted separately, including a preserved 17.125 fixture.
- Updated setup, migration, frontend/backend and historical audit documentation to reflect the new behavior. Kept the original probe observations as historical evidence; current regression suites supersede that script.

Implementation follows [PostgreSQL row-lock semantics](https://www.postgresql.org/docs/17/explicit-locking.html), [Nest rate limiting](https://docs.nestjs.com/security/rate-limiting), [Nest cookies](https://docs.nestjs.com/techniques/cookies), [Drizzle PostgreSQL types](https://orm.drizzle.team/docs/column-types), and [TanStack Query v5 defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults).

## Verification

Native environment: NixOS, Node 24.21, pnpm 9, PostgreSQL 17 on loopback 15439. Docker builds use Node 22. Only synthetic isolated databases were used. The local /tmp/hospital-audit-run.py wrapper injects dedicated test database credentials privately; repository commands and test setup are documented in the root README.

| Executed command/scenario | Result |
| --- | --- |
| Initial `python3 /tmp/hospital-audit-run.py hospital_resume_test pnpm --filter backend exec jest --config test/jest-e2e.json --runInBand code-quality` | EXPECTED FAIL before repairs: all six targeted regressions reproduced |
| `pnpm install --frozen-lockfile` | PASS; lockfile unchanged by installation |
| `pnpm --filter backend typecheck`; `pnpm --filter frontend typecheck` | PASS; production builds also ran TypeScript on the final application sources |
| `pnpm --filter backend lint` | PASS |
| Frontend `biome check --write`, then `biome format` via the Nix dynamic loader | PASS; existing sidebar preference-cookie warning remains, with no lint errors |
| `pnpm --filter backend format:check` | PASS |
| `pnpm --filter backend test -- --runInBand` | PASS: 15 suites / 19 tests, 2.7 seconds |
| `python3 /tmp/hospital-audit-run.py hospital_resume_test pnpm --filter backend db:migrate` | PASS: additive migration on the existing dedicated test database |
| `python3 /tmp/hospital-audit-run.py hospital_resume_browser_test pnpm --filter backend db:migrate` | PASS: additive migration before browser startup |
| `python3 /tmp/hospital-audit-run.py hospital_resume_test pnpm --filter backend test:e2e` | PASS: 3 suites / 20 tests, 15.7 seconds on the final application sources |
| Migration lifecycle suite | PASS: clean initialization, repeat migration, repeat seed, original-schema adoption, unchanged original data digest, fractional-cent preservation, incompatible-schema/unknown-history refusal |
| Business/security regression suite | PASS: concurrent doctor claim, terminal transitions, blank content, exact/legacy money, DB checks, minimized billing reads, shared doctor reads, audit rollback, HttpOnly cookies, CSRF origin rejection, revocation and login 429 |
| `pnpm --filter backend build`; `pnpm --filter frontend build` | PASS; 15 frontend routes generated successfully |
| `python3 /tmp/hospital-audit-run.py hospital_resume_browser_test pnpm --filter frontend test:e2e` | PASS: 4 tests, 59.5 seconds; real six-role workflow, multiple staff sessions without reload, overdue/legacy PHP billing, cookie privacy/reload/logout, error recovery, keyboard interaction and 320/390/768/1280 layouts |
| `git diff --check` | PASS |
| `docker build -f Dockerfile.backend -t hospital-backend:quality .` | PASS; full Node 22 install/build/production packaging |
| `docker build -f Dockerfile.frontend --build-arg NEXT_PUBLIC_API_URL=http://localhost:38080 -t hospital-frontend:quality .` | PASS; standalone frontend and static assets packaged |
| `python3 /tmp/hospital-audit-run.py hospital_resume_browser_test python3 /tmp/hospital-quality-container-smoke.py` | PASS: started isolated backend/frontend containers on loopback 38080/33000 against the dedicated test DB; an immediate readiness curl initially returned 56 before startup completed, then returned healthy |
| `curl --fail --silent http://localhost:38080/health` | PASS after startup: status ok |
| `docker exec hospital-quality-backend node dist/src/database/migrate.js` | PASS: packaged compiled migrator repeat-applied successfully |
| `docker exec hospital-quality-backend id -u`; equivalent frontend command | PASS: both run as UID 1000 |
| `python3 /tmp/hospital-audit-run.py hospital_resume_browser_test node /tmp/hospital-quality-container-browser.cjs` | PASS: production Secure/HttpOnly cookie on localhost, real PHP bill creation/payment, session restore on reload, logout replay 401, zero page errors |
| `docker stop hospital-quality-backend hospital-quality-frontend` | Test containers stopped; database and volumes preserved |
| `pnpm audit --prod --json` | PASS: zero advisories across all severities |
| Cloud deployment, real production upgrade, TLS infrastructure, formal penetration/compliance/accessibility audit | NOT RUN; outside the authorized local scope |

## Remaining issues

**Local blockers:** none observed in the executed application, migration, browser and Docker checks. No unexecuted operation is claimed successful.

**Operational prerequisites before real clinical/financial use:** HTTPS on same-site frontend/API domains, exact CORS configuration, database backup/restore practice, protected secrets, restricted database roles, monitored failures, account offboarding, and an explicit retention/read-audit policy. Existing unreviewed bills need deliberate staff currency/precision confirmation; they stay visible and excluded from confirmed-PHP totals. This is not clinical compliance certification or real payment processing.

**Optional improvements:** server pagination/search and query-specific performance indexes; more narrowly split browser workflows; API contract generation; protected in-memory SOAP draft navigation; broader accessibility testing; appointment availability/conflict policy. These need product/workload evidence rather than an unrelated architecture rewrite.

## Security and reliability concerns

The limiter is per API process and uses the connection IP; horizontally scaled deployments need shared limiter storage and deliberately configured trusted-proxy handling. No arbitrary proxy trust or Redis dependency was added. Session expiry is enforced on every HTTP request; expired session row cleanup/retention remains an operator task. Logout revokes one session; there is no account-wide session management/MFA/offboarding UI. Existing socket clients receive only refresh hints; sockets are unused by the UI and were not expanded into clinical event streams or a full revocation-aware subscription lifecycle.

Audit entries are append-only through application write paths, not tamper-proof against a database owner. They contain mutation metadata, not full before/after clinical snapshots or read-access auditing. Read auditing, financial adjustments/refunds, and account deactivation need defined policies. Current account deletion respects restrictive audit references. Outstanding lists are not load-tested at production volumes. No live AWS/cluster/OIDC rollout was verified.

## Architecture and major data flows

Next.js/React renders six role-specific workspaces. React Query fetches real Nest APIs, handles mutation invalidation and foreground polling; Zustand holds only user identity in memory. Browser requests carry the HttpOnly cookie. Nest JWT validation checks the backing Session and current User role; guards and services enforce role/ownership boundaries. DTOs validate input before transactional Drizzle queries through the existing pg pool. Mutations append AuditLog metadata in the same transaction.

PostgreSQL stores the original seven tables plus Session; original IDs, enums, links and legacy columns remain. Patient registration/profile → Appointment → Queue → authored SOAP notes → Billing remains the product flow. Billing reads minimal patient selectors; exact PHP amounts use integer centavos, with explicit review for legacy records. Compose preserves the database-health → migration → backend startup sequence and packages the standalone frontend. Existing AWS/kubeadm infrastructure remains undeployed.

## Recommended next steps

1. Review changes and rehearse backup/restore plus migration on a sanitized real-schema copy before any deployment.
2. Define account deactivation/session revocation, audit retention/read logging and financial adjustment procedures before admitting real data.
3. Configure and verify HTTPS, same-site origins, secrets, least-privilege database access and monitoring for the chosen environment.
4. Add pagination/search and performance indexes when the expected data volume is known.
5. Expand focused accessibility/clinical scheduling checks and portfolio documentation using the verified workflows.

### Nix-specific frontend commands executed

From `apps/frontend`, the downloaded Biome executable was invoked with Nix's loader:

```sh
/nix/store/lm3pknxi0ipypy3lxh1wmm8wvvavdwrn-glibc-2.42-84/lib/ld-linux-x86-64.so.2 /mnt/storage/projects/hospitalProject/node_modules/.pnpm/@biomejs+cli-linux-x64@2.2.0/node_modules/@biomejs/cli-linux-x64/biome check --write
/nix/store/lm3pknxi0ipypy3lxh1wmm8wvvavdwrn-glibc-2.42-84/lib/ld-linux-x86-64.so.2 /mnt/storage/projects/hospitalProject/node_modules/.pnpm/@biomejs+cli-linux-x64@2.2.0/node_modules/@biomejs/cli-linux-x64/biome format
```

The first formatting/lint pass identified an effect dependency error, which was corrected without suppressing the rule; the subsequent check passed. Backend lint initially identified three unused destructured variables, corrected before the successful lint run. Frontend type checking identified the old token reference in profile updates, removed before final builds/tests. Standard Linux/CI can use the repository's normal lint/format scripts.
