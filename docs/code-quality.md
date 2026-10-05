# Frontend-to-backend code quality audit

**Historical pre-fix findings.** The authorized repairs and current verification are in [code-quality-fixes.md](code-quality-fixes.md). The failures below were reproduced before repair; they are retained as evidence, not a list of current unresolved defects.

The project is a working local baseline with a sensible architecture, real integration coverage, and an unusually careful database migration. It is not yet reliable enough for concurrent clinical use. Passing the existing workflow suite does not establish correctness for concurrent writers, terminal status changes, overdue bills, or multiple browser sessions.

Scope: the current uncommitted working tree, including the UI redesign and Drizzle migration. Reviewed frontend pages/components/hooks, API and authentication state, shared types, backend controllers/guards/DTOs/services, database schema/access/migration code, and test structure. No application source was modified by this audit. Only this report and a reproducible probe script were added. No deployment, commit, push, or destructive database operation was performed.

## Severity and evidence

- **Blocking:** resolve before demonstrating concurrent clinical workflows or handling real clinical data. These do not prevent local startup.
- **Important:** a real workflow, correctness, maintainability, or operational gap worth fixing next.
- **Improvement:** useful cleanup or scalability work without a demonstrated failure at the current data size.
- **Reproduced:** observed against the production application builds and an isolated synthetic PostgreSQL test database.
- **Inspected:** established from source; no exploit, load benchmark, or production incident is claimed.

## Findings, ranked

### CQ-01 — Blocking: appointment ownership can change during concurrent confirmation

**Reproduced.** Two different doctors simultaneously confirmed an unassigned appointment. Both received HTTP 200 in **10 of 10 attempts**. Each request reads an unassigned record before the write; each then assigns its own doctor ID. The write condition checks only the appointment ID, so the later writer can replace the first doctor's assignment.

Location: [AppointmentsService](../apps/backend/src/appointments/appointments.service.ts), lines 95–125, especially the separate read, automatic assignment, and unconditional update.

Impact: both clinicians believe they claimed the visit; the persisted assignment reflects the last writer. The existing ownership check is correct for sequential requests but does not protect the read/write interval.

Recommended repair: make assignment, ownership validation, and status transition one atomic operation. Use a row lock in a transaction and recheck permissions after locking, or a conditional update that fails when ownership/status has changed. Add a two-doctor concurrency regression test expecting one success and one conflict/denial. PostgreSQL documents how row locks serialize competing updates in [Explicit Locking](https://www.postgresql.org/docs/17/explicit-locking.html).

### CQ-02 — Blocking: patients can overwrite completed appointment history

**Reproduced.** Created an appointment, confirmed and completed it as a doctor, then sent `PATCH /appointments/:id` with `{ "status": "CANCELLED" }` as its patient. The API returned **200** and changed `COMPLETED` to `CANCELLED`.

Location: [AppointmentsService](../apps/backend/src/appointments/appointments.service.ts), lines 95–125. The patient restriction checks the requested fields and new status, but never checks the existing status. The [appointment UI](../apps/frontend/src/app/dashboard/appointment/page.tsx) only offers cancellation for pending/confirmed visits; that rule is not enforced on the server.

Recommended repair: define an explicit transition matrix and enforce it in the same atomic operation as the update. At minimum, patient cancellation should respect the current UI's pending/confirmed eligibility. Define deliberate correction/reopening rules for staff instead of allowing arbitrary status overwrites. Review billing and queue transitions under the same principle; those policies are also permissive, though this audit's terminal-state reproduction specifically concerns appointments.

### CQ-03 — Important: different staff sessions do not stay synchronized

**Reproduced.** Opened a doctor's queue, added a patient through a separate authenticated staff API request, and observed **zero new queue GET requests** during the following 1.2 seconds. The patient was absent in the mounted page and appeared immediately after reload.

Locations: [QueryProvider](../apps/frontend/src/providers/query-provider.tsx), lines 20–25; [useQueue](../apps/frontend/src/hooks/use-queue.ts), lines 5–9; [AppointmentsGateway](../apps/backend/src/appointments/appointments.gateway.ts).

There is no polling or frontend socket subscription. Window-focus refetching is disabled, and mutation invalidation updates only the current browser's cache. The five-minute `staleTime` is not a five-minute refresh timer: mounted data can remain stale until another refetch trigger occurs. This follows the installed TanStack Query v5 behavior described in [Important Defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults).

Recommended repair: define refresh expectations for queue/scheduling screens and implement modest foreground polling or authenticated refresh events, plus a visible refresh action/time. Keep HTTP authoritative. Reference data such as doctor choices need not use the same policy as a live queue.

### CQ-04 — Important: backend validation is weaker than frontend validation

**Reproduced.** A visit reason containing only spaces received **201**. A SOAP request containing only patient/doctor IDs, with no clinical content, also received **201**.

Locations: [CreateAppointmentDto](../apps/backend/src/appointments/dto/create-appointment.dto.ts), lines 24–26; [CreateConsultNoteDto](../apps/backend/src/consult-notes/dto/create-consult-note.dto.ts); [ConsultNotesService](../apps/backend/src/consult-notes/consult-notes.service.ts), lines 35–46. The UI trims visit reasons and rejects empty notes, but direct API callers bypass those rules.

Recommended repair: enforce the same meaningful-content rules in DTO/service validation, preserve deliberate optional SOAP sections, and bound text lengths where appropriate. Reject empty updates explicitly where no valid operation is supplied. The global whitelist and strict calendar-date validation are good existing controls; this finding concerns business content, not a complete absence of validation.

### CQ-05 — Important: the billing interface omits a supported status

**Reproduced.** Created an `OVERDUE` bill through the actual API, then opened billing. The record appeared, but its **Mark paid button count was 0** and its **OVERDUE filter option count was 0**.

Locations: [billing page](../apps/frontend/src/app/dashboard/billing/page.tsx), lines 19–24, 78–79, 135, and 163; [BillingStatus/schema](../apps/backend/src/database/schema.ts); [BillingService](../apps/backend/src/billing/billing.service.ts), lines 44–65.

The API supports `OVERDUE`, while the frontend status is an unrestricted string and its supported actions/filter list omit that value. Outstanding amounts also total only `PENDING` bills, excluding overdue balances.

Recommended repair: share a complete billing status contract and define which outstanding statuses can be paid. Include overdue amounts in outstanding totals and provide the relevant action/filter. No overdue scheduler was found; this is a supported API/imported-data path, not a claim that the current UI automatically creates overdue bills.

### CQ-06 — Blocking for real clinical data: there is no application audit trail

**Reproduced and inspected.** Registration, clinical note creation, appointment transitions, billing creation, and queue insertion produced **zero new AuditLog rows**. Source search found the table, relations, and migration fixture, but no application writer.

Location: [schema](../apps/backend/src/database/schema.ts), lines 177–186, and mutation services.

Recommended repair: define the audit requirements and append actor/action/resource/change metadata transactionally with sensitive mutations. Clinical edits and payment recording should be attributable. Avoid storing passwords, tokens, or unnecessary clinical text in logs. Whether reads must be audited requires a product/operational policy decision; no regulatory compliance conclusion is made here.

### CQ-07 — Blocking for public/real-data use: authentication and clinical access need explicit hardening

**Inspected; no XSS exploit or brute-force attack was executed.** Auth state persists the bearer token through default browser storage, login has no application rate limit, there is no session revocation mechanism, and staff record reads are broad. Billing staff can retrieve full patient demographics; doctors/nurses/admins can read consultation records without an assignment check.

Locations: [auth store](../apps/frontend/src/stores/auth-store.ts), lines 14–25; [AuthService](../apps/backend/src/auth/auth.service.ts), line 14; [PatientsService](../apps/backend/src/patients/patients.service.ts), lines 39–55; [ConsultNotesService](../apps/backend/src/consult-notes/consult-notes.service.ts), lines 48–65.

These are limits of the current policy, not a demonstrated bypass of existing role guards. Patient ownership, authenticated authors, password redaction, JWT expiration, and current-role reloads are already enforced.

Recommended repair: agree on the clinical read/access matrix; return minimal patient fields for billing selectors; add login abuse controls and deliberate session/logout policy. Consider HttpOnly sessions only with the corresponding CORS/CSRF and deployment design. Do not silently change staff access or switch authentication architecture as a cosmetic refactor.

### CQ-08 — Important: API types do not enforce the actual boundary

**Inspected.** Create hooks use response-derived types such as `Omit<Appointment, "id">` and `Omit<Patient, "id">`, which permit relation/server-managed fields the strict backend rejects. Billing uses `status: string`. Consult-note/doctor types omit real nullable fields. `apiFetch<T>` treats JSON as the declared type without checking it, and errors lose HTTP status/details. Backend controllers have untyped request arguments while `noImplicitAny` is explicitly disabled.

Locations: [appointment hooks](../apps/frontend/src/hooks/use-appointments.ts), line 16; [patient hooks](../apps/frontend/src/hooks/use-patients.ts), line 15; [consult-note types](../apps/frontend/src/hooks/use-consult-notes.ts), lines 4–14; [API helper](../apps/frontend/src/lib/api.ts), lines 5–28; [backend tsconfig](../apps/backend/tsconfig.json), lines 20–23.

Recommended repair: introduce explicit request/response types for each supported operation, including nullability and complete enums. Type authenticated controller requests using Actor. Add a structured API error type so retry logic can distinguish validation/auth failures from transient server failures. Use existing Zod at selected response boundaries or generate contracts from OpenAPI if that later provides concrete value; a new contract framework is not necessary for this project. Enable stronger TypeScript checks incrementally. [TypeScript noImplicitAny](https://www.typescriptlang.org/tsconfig/noImplicitAny.html) explains what that compiler option catches.

### CQ-09 — Important: test coverage is stronger for the main workflow than for rules

**Inspected; prior passing checks reused.** There are 15 backend unit spec files and **12 instantiation-only tests** among the previously passing 19 unit tests. Appointment, billing, queue, and patient service unit tests do not assert their business behavior. Most browser workflows run in a single long, ordered test, so an early failure prevents later workflows from executing.

Locations: [appointment service spec](../apps/backend/src/appointments/appointments.service.spec.ts), line 17; analogous billing/queue/patient specs; [browser workflows](../apps/frontend/test/workflows.spec.ts), line 22.

The PostgreSQL integration suite and real browser test are valuable and already verify ownership, constraints, queue concurrency, and happy-path integration. They simply do not cover the defects above.

Recommended repair: add focused regression tests for concurrent doctor claims, terminal status rules, empty content, overdue bills, and separate sessions. Split browser scenarios by workflow using isolated fixtures. Prefer rule/concurrency tests over expanding constructor smoke tests or introducing a large new testing stack.

### CQ-10 — Important for financial use: money has no precision/currency contract

**Reproduced and inspected.** The API accepted **17.125** as a bill amount; the UI displays two decimal places. Amounts are stored as double precision and currency is unspecified.

Locations: [billing schema](../apps/backend/src/database/schema.ts), line 171; [CreateBillingDto](../apps/backend/src/billing/dto/create-billing.dto.ts); [billing display](../apps/frontend/src/app/dashboard/billing/page.tsx), lines 31–35.

Recommended repair: agree on currency and rounding rules, then use exact decimal or integer minor-unit storage and matching request validation. The Drizzle migration deliberately preserved the original floating-point column; this is an inherited model limitation, not evidence of a migration regression. An actual money-column migration requires checking existing values on a backup before changing data.

### CQ-11 — Improvements: bounded reads, diagnostics, and smaller page responsibilities

**Inspected; no load-performance failure or formal accessibility certification is claimed.**

- Patient, appointment, billing, and note collections are fetched without pagination. Filtering/sorting happens in the browser. Nonunique workload indexes are absent from the application schema. Add bounded reads and indexes based on actual queries/measurements, preserving migration semantics.
- The catch-all error filter shields clients from database internals, which is good, but server logs contain only exception name/code. Request IDs and sanitized structured context would make diagnosis easier. [DatabaseErrorFilter](../apps/backend/src/database/database-error.filter.ts), lines 26–29.
- `/health` is liveness, not continuing database readiness. Add a distinct readiness contract if an operator needs it; do not claim the database is healthy from the current static response. [AppController](../apps/backend/src/app.controller.ts).
- Appointment/billing pages combine mutations, state, filtering, and large forms. The appointment page is 392 lines and billing is 282. Extract the booking form and billing data hook where that improves ownership/testability; do not split files merely to reduce line counts or replace the UI framework.
- SOAP draft cancellation is protected, but navigation/closing a tab can lose an unsaved draft. Define a draft lifecycle without automatically persisting sensitive text in localStorage. This limitation was already documented in the UI report.
- The socket gateway verifies signatures but does not reload current users/roles as HTTP authentication does. Its events contain only refresh hints, not records, so this audit found no patient-data disclosure through that gateway. Address authorization/lifecycle parity if real-time features are expanded.

## What is already good

The frontend/API/database separation is clear. Existing libraries are reused rather than replaced. Shared UI states, accessible dialogs, form labels, role navigation, and responsive browser checks are present. HTTP endpoints enforce server-side authentication/roles, patient ownership, authenticated note authorship, public-user projections, strict date validation, and prohibited-field rejection. SQL uses parameterized Drizzle operations.

Queue insertion/update use transactions and an advisory lock; call-next uses row locking with `SKIP LOCKED`. Those choices already have meaningful PostgreSQL integration coverage. The Drizzle schema preserves the original relationships/defaults/constraints, and baseline adoption verifies physical schema compatibility without resetting application data. Additive seeds and migration/data-preservation tests are strong parts of this baseline.

## Executed evidence and limitations

The immediately preceding requested integration rerun passed **2 browser tests** and **2 backend suites / 9 tests** against actual PostgreSQL. The UI production build, typecheck, lint, and formatting results from the same unchanged application source were reused rather than rerun just to accumulate evidence.

For this audit, started the existing production backend/frontend builds on local ports 3000/3001 with the dedicated `hospital_resume_browser_test` database, then ran:

```sh
python3 /tmp/hospital-audit-run.py hospital_resume_browser_test \
  node /tmp/hospital-code-quality-probes.cjs
```

The wrapper provides credentials in process environment without printing them. [The retained probe script](code-quality-probes.cjs) is identical to the executed temporary script. From the repository root it requires `DATABASE_URL` pointing to a dedicated database with `test` in its name, `SEED_PASSWORD` matching the seeded demo accounts, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for this NixOS host. Both application builds must already be running at their standard local ports. It creates only uniquely named synthetic records and never drops/truncates/deletes existing data.

Probe output:

```json
{"probe":"patient-cancels-completed-appointment","status":200,"result":"CANCELLED"}
{"probe":"concurrent-doctor-claim","attempts":10,"bothReceived200":10}
{"probe":"whitespace-visit-reason","status":201}
{"probe":"empty-SOAP-note","status":201}
{"probe":"fractional-cent-bill","status":201,"amount":17.125}
{"probe":"overdue-bill-UI","visible":true,"markPaidButtons":0,"overdueFilter":0}
{"probe":"cross-session-queue-refresh","appearedBeforeReload":false,"readsBeforeReload":0,"appearedAfterReload":true}
{"probe":"audit-trail","newAuditRows":0}
```

The probe completed with exit 0, meaning the observations completed successfully, **not** that the application passed these negative cases. These findings remain unfixed. Temporary application processes were stopped afterward; synthetic test records were retained.

No real-user/production database, cloud deployment, load test, penetration test, screen-reader audit, or formal clinical/compliance review was performed. The prior migration test uses a legacy schema fixture, not a production upgrade. Existing working-tree changes were preserved.

## Repair order

1. Add failing regressions for CQ-01 and CQ-02, then repair atomic appointment ownership and transition rules.
2. Repair CQ-04 and CQ-05 with server-side content rules and complete billing contracts.
3. Implement and test a cross-session refresh policy for queue/scheduling screens.
4. Strengthen explicit API types, authenticated request typing, error semantics, and focused tests.
5. Before public/real-data use, settle clinical access, audit logging, login/session hardening, and financial data rules.
6. Add measured pagination/indexing, readiness/diagnostics, and targeted form/hook extraction.

The existing architecture can support these repairs. A framework migration or broad rewrite would not address the main defects.
