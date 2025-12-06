# Project: "Pulse" – Unified Hospital Management Architecture
**Type:** Advanced Full-Stack Portfolio Capstone
**Owner:** Solo Developer
**Goal:** Refresh Web Dev Skills & Master Modern Stack

## 1. Tech Stack (Strictly Enforced)
| Layer    | Tool                                         | Usage Rule |
| :------- | :------------------------------------------- | :--------- |
| Frontend | Next.js 14 (App Router) + TypeScript         | Server Components default |
| Styling  | Tailwind CSS + shadcn/ui                     | Use standard tokens |
| State    | TanStack Query v5 + Zustand                  | Server state vs Client state separation |
| Backend  | NestJS + TypeScript                          | Strict DTO validation |
| ORM      | Prisma                                       | Migration-driven changes |
| Auth     | JWT + Passport.js                            | RBAC Guards on ALL routes |
| DB       | PostgreSQL                                   | Local dev -> Cloud prod |

## 2. Core Modules Structure (NestJS)
```
src/
├── auth/          # JWT + Passport guards (DONE)
├── users/         # User CRUD + role assignment (DONE)
├── patients/      # Patient profiles (Day 3 Target)
├── appointments/  # RMC booking/cancel (Day 3 Target)
├── queue/         # RMC queue management (Day 4 Target)
└── billing/       # Read-only charges view (Day 4 Target)
```

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

## 4. RBAC Roles Scope (Phase 1)
| Role | Permissions |
| :-- | :-- |
| **Patient** | View/Edit ONLY their own record. |
| **Doctor** | View all patients, write consult notes. |
| **Nurse** | View patients, triage/vitals entry. |
| **Front Desk** | Register patients, manage Queue. |
| **Billing** | Read-only charges view. |

## 5. Daily Execution Plan (Dec 5 - Dec 12)

### ✅ Day 1 (Dec 5): Foundation
- Monorepo init, Prisma schema setup, Postgres local.

### ✅ Day 2 (Dec 6): Auth Module
- NetJS AuthModule, JWT Strategy, Login/Register endpoints.
- RBAC Guards (`@Roles`).

### 🚀 Day 3 (Dec 7 - TODAY): Patient & Appointment APIs
- **Goal:** Backend CRUD for Patients and Appointments.
- [ ] **Data Modeling:** Define `Patient` and `Appointment` in Prisma.
- [ ] `PatientsModule`: Create/Get profile. **Crucial:** Row-Level Security (User can only see linked Patient profile).
- [ ] `AppointmentsModule`: Book/Cancel slots. validation with Zod.
- [ ] Postman verification.

### 📅 Day 4 (Dec 8): Queue & Billing APIs
- `QueueModule`: Add to queue / Call next.
- `BillingModule`: Read-only list.
- **Milestone:** Full Backend API "Steel Thread" complete.

### 📅 Day 5 (Dec 9): Patient Portal Frontend
- Next.js Setup, TanStack Query, Auth Context.
- Login / Register / Appointment Booking UI.

### 📅 Day 6 (Dec 10): Staff Portal Frontend
- Role-based redirects (`/staff/dashboard`).
- Queue Management UI (Front Desk).

### 📅 Day 7 (Dec 11): Clinical UI
- Doctor Console (Patient Details + SOAP Notes).
- Billing View.

### 📅 Day 8 (Dec 12): Deployment & Documentation
- Deploy Vercel (Front) + Render/Railway (Back).
- Record Demo Video.
- Final Code Freeze for Portfolio.

## 6. Data Schema Strategy (Prisma)
To keep the learning curve manageable and "Phase 1" realistic:

*   **User vs Patient:**
    *   **Decision:** 1:1 Relationship.
    *   **Why:** Simplifies Auth. Every "Patient User" has exactly one "Patient Profile".
    *   **Fields:** `dob`, `phone`, `gender` live on `Patient`, not `User`.

*   **Appointments:**
    *   **Lifecycle:** `PENDING` -> `CONFIRMED` -> `COMPLETED` / `CANCELLED`.
    *   **Fields:** `dateTime`, `reason`, `status`.

*   **Queue (RMC):**
    *   **Logic:** Daily reset.
    *   **Fields:** `ticketNumber` (String, e.g. "A-101"), `status` (`WAITING`, `SERVING`, `DONE`).

*   **Audit Logging (Privacy Compliance):**
    *   **Requirement:** Track every "View" action by staff.
    *   **Table:** `AuditLog` (`actorId`, `action`, `resourceId`, `timestamp`).

## 7. Success Metrics
- **Uptime:** Zero crashes on invalid input (Zod validation).
- **Security:** A Patient `POST`ing to `/appointments` cannot book for another user ID.
- **Completeness:** 10 core screens functional.
