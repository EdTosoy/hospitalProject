# Pulse UI and UX

The interface is designed around outpatient visits and the six roles already supported by the application. It retains Next.js, Tailwind, Radix, React Query, React Hook Form, Zod, and the existing NestJS API. There are no new UI dependencies or mock dashboard data.

## Design decisions

- A restrained teal, slate, and white palette, readable typography, consistent panel spacing, and stronger primary-button contrast replace inconsistent screen styling.
- The shared workspace header identifies the role and current section. Navigation highlights the actual route, including consultation records; mobile navigation closes after choosing a page. The overview and public landing page provide skip links.
- Patient dashboards prioritize profile readiness and the next future appointment. Doctor, nurse, front-desk, and admin dashboards prioritize today's active appointments and patient flow, with actions appropriate to their role. Admins also get a billing shortcut; billing staff see real charge and payment metrics.
- Appointment booking and bill creation sit beside the record list on wide screens and stack on small screens. Forms explain what a request or payment action actually does.
- Appointment, queue, and billing lists support status filters and text search. The patient directory supports name/phone search. Searches operate on records already returned by the API; the server still enforces access.
- The queue opens on active entries. Completed and no-show records remain accessible through the filter. Queue counts describe their actual scope, without inventing wait-time estimates.
- Patient contact and demographic details are collapsed in the directory, reducing incidental exposure. This is a presentation choice, not an authorization boundary; authorized records are still present in the browser.
- Patient profiles support real demographic/contact edits through `PATCH /patients/:id`. Account edits continue through the existing authenticated user endpoint.
- SOAP notes have labeled sections and explanatory hints. Empty notes are rejected in the UI. Cancelling a populated draft requires confirmation; drafts are not persisted to browser storage. Saved notes display their author and timestamp in newest-first order.
- Cancelling an appointment and recording a payment require explicit confirmation. Payment recording does not process a financial transaction. The initial redesign kept currency unspecified; the subsequent authorized quality fixes add PHP billing, exact centavos, and an explicit review UI for legacy amounts.
- Shared loading, empty, error, and retry components provide consistent feedback. Mutations show pending states and API errors. Password visibility, autocomplete, keyboard focus indicators, responsive touch controls, and reduced-motion styling support everyday usability.
- The public landing page explains the actual profile → request → confirmation workflow, replacing the fictional patient preview. Staff access and patient registration remain distinct entry points to the existing authentication system.

## Verification

Run the repository frontend checks and the browser suite after building both applications. See the root README for dedicated test database setup. Browser tests use real production application builds and PostgreSQL; only the deliberate outage scenario intercepts an API request.

```sh
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend format:check
pnpm --filter frontend build
# DATABASE_URL must reference a dedicated migrated database with "test" in its name.
pnpm --filter frontend test:e2e
```

On this NixOS machine the generic Biome binary needs the system ELF loader. The equivalent executed frontend check is:

```sh
cd apps/frontend
/nix/store/lm3pknxi0ipypy3lxh1wmm8wvvavdwrn-glibc-2.42-84/lib/ld-linux-x86-64.so.2 \
  ../../node_modules/.pnpm/@biomejs+cli-linux-x64@2.2.0/node_modules/@biomejs/cli-linux-x64/biome check
# Substitute "format" for "check" to verify formatting.
```

The expanded browser suite covers all six roles, profile creation/edit persistence, booking/confirmation/completion/cancellation, walk-in registration, queue operations, SOAP creation and empty-note validation, billing and payment confirmation, forbidden access, expired sessions, real API failure recovery, search/filter states, collapsed demographics, mobile navigation, keyboard login navigation, password visibility, and login errors. The landing page, authentication pages, dashboards, patient directory, profile, queue, billing, and saved consultations are checked at 320, 390, 768, and 1280 pixels. Appointments are exercised on desktop and checked for overflow at 390 pixels. Desktop/mobile screenshots and failure traces are written to ignored `apps/frontend/test-results` artifacts.

The first redesign run exposed numbered SOAP labels being included in accessible names. The decorative numbers were moved outside the label and marked `aria-hidden`, preserving both the field's accessible name and native label text. Final executed outcomes:

| Check | Outcome |
| --- | --- |
| `pnpm --filter frontend typecheck` | PASS |
| Frontend `biome check` using the NixOS loader above | PASS; existing sidebar-preference cookie warning remains |
| Frontend `biome format` using the loader above | PASS |
| `pnpm --filter frontend build` | PASS, including Next.js TypeScript checks and production page generation |
| `python3 /tmp/hospital-audit-run.py hospital_resume_browser_test pnpm --filter frontend test:e2e` | PASS: 2 browser tests, 28.7 seconds total; wrapper supplies local dedicated test DB credentials without printing them |
| `git diff --check` | PASS |
| Desktop/mobile screenshot inspection | Reviewed doctor overview, appointments, consultation, and billing |
| Backend/Docker/infrastructure checks repeated for this UI change | NOT RUN; no changes in those layers, preceding baseline evidence remains in the audit |
| Formal screen-reader/WCAG review | NOT RUN |

The confirmation test initially queried background records through an accessibility-role locator while a modal deliberately hid them from the accessibility tree. The record assertion now explicitly includes hidden background content to verify the bill remains pending before confirmation. This retains the modal's focus isolation and tests the actual state transition. SOAP draft cancellation tests verify that going back preserves the draft and confirming discard removes only the unsaved draft. The final six-role workflow test observed no browser `pageerror` events.

## Limits and next steps

This work does not establish a formal WCAG certification or replace clinical/security review. Screen-reader testing, high-zoom testing, and independent accessibility review remain useful. Draft cancellation is protected; navigating elsewhere or closing a tab can still lose an unsaved SOAP draft. A full draft lifecycle needs explicit product policy for retention and sensitive-data storage.

Search is local to the API response, without pagination or server-side search. The subsequent [quality repairs](code-quality-fixes.md) address exact PHP billing, cookie sessions/revocation, shared clinical reads with billing minimization, server transition rules, and live operational refresh. Appointment availability and infrastructure limitations remain as documented in the audit. No deployment, commit, or push is performed as part of this redesign.
