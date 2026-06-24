# ARCHITECTURE_v1.md

> Version 1 — expanded to include frontend layer architecture, frontend ↔ backend integration design,
> and a full log of all pages, services, and files built to date.
> Original system architecture is documented in `ARCHITECTURE.md`.

---

## Application

Restaurant Shift Scheduling Application.

This is a web-based scheduling application for restaurants.

The MVP focuses on manual scheduling first, not automatic optimization.

---

## Final Architecture

```text
frontend/
  React + Vite + TypeScript

backend/
  NestJS + Prisma + JWT Auth

database/
  Supabase PostgreSQL
```

The frontend communicates only with the NestJS backend API.

The backend owns authentication, authorization, business rules, validation, and scheduling logic.

Supabase is used only as the managed PostgreSQL database.

---

## Technology Stack

* React + Vite + TypeScript
* CSS Modules
* React Router
* jsPDF (PDF export)
* Node.js
* NestJS backend
* Prisma ORM
* Supabase PostgreSQL
* JWT Authentication
* Vitest

---

## Project Structure (current state)

```text
Schedule_Planner/
├── docs/
│   ├── ARCHITECTURE.md             — original system architecture (untouched)
│   ├── ARCHITECTURE_v1.md          — this file
│   └── API_CONTRACTS.md            — API request/response shapes
│
└── frontend/
    └── src/
        ├── app/
        │   ├── App.tsx             — routing only
        │   └── styles.css
        │
        ├── shared/
        │   ├── components/
        │   │   ├── PhoneShell.tsx          — mobile phone frame wrapper
        │   │   ├── StatusBar.tsx           — top status bar
        │   │   └── BottomNav.tsx           — bottom navigation (manager + employee variants)
        │   ├── lib/
        │   │   └── apiClient.ts            — base HTTP client with JWT token attachment
        │   └── types/
        │       └── api.types.ts            — TypeScript types mirroring API_CONTRACTS.md
        │
        └── features/
            ├── auth/
            │   ├── pages/
            │   │   └── LoginPage.tsx       — role toggle, email/password, demo credentials card; no StatusBar (login screen is not a phone-shell screen)
            │   └── services/
            │       └── auth.service.ts     — login(), getCurrentUser(), logout()
            │
            ├── employees/
            │   ├── pages/
            │   │   └── ManagerTeamPage.tsx — team list, role filter, employee detail sheet, PDF export
            │   ├── services/
            │   │   └── employees.service.ts
            │   └── types/
            │       └── employee.ts
            │
            ├── schedules/
            │   ├── pages/
            │   │   └── ManagerDashboardPage.tsx — calendar, shift list per day, Add Shift modal
            │   └── services/
            │       └── schedules.service.ts
            │
            ├── shifts/
            │   ├── pages/
            │   │   ├── EmployeeShiftsPage.tsx        — My Shifts: calendar + day detail + upcoming list
            │   │   └── EmployeeShiftsPage.module.css
            │   └── services/
            │       └── shifts.service.ts
            │
            ├── availability/
            │   ├── pages/
            │   │   └── AvailabilityPage.tsx     — shared manager + employee, week view, morning/evening toggles
            │   └── services/
            │       └── availability.service.ts
            │
            ├── swaps/
            │   ├── pages/
            │   │   ├── EmployeeSwapsPage.tsx         — swap requests list, status badges, New Request modal
            │   │   └── EmployeeSwapsPage.module.css
            │   └── services/
            │       └── swaps.service.ts
            │
            └── profile/
                └── pages/
                    └── ProfilePage.tsx          — shared manager + employee, info cards, hours progress
```

---

## Routes

### Manager Routes

| Path | Page | Notes |
|---|---|---|
| `/manager/schedule` | ManagerDashboardPage | Calendar + shift list + Add Shift modal |
| `/manager/team` | ManagerTeamPage | Team list, filter, PDF export |
| `/manager/availability` | AvailabilityPage | Week availability view |
| `/manager/requests` | — | Coming soon |
| `/manager/profile` | ProfilePage | Sign Out button |

### Employee Routes

| Path | Page | Notes |
|---|---|---|
| `/employee/shifts` | EmployeeShiftsPage | Calendar + upcoming shifts |
| `/employee/availability` | AvailabilityPage | Week availability with 14h deadline timer |
| `/employee/swaps` | EmployeeSwapsPage | Swap requests + New Request modal |
| `/employee/alerts` | — | Coming soon |
| `/employee/profile` | ProfilePage | Switch Demo User button, remaining hours |

---

## Frontend Layer Architecture

The frontend is divided into four layers. Each layer has a single responsibility.
No layer may skip a layer below it.

```text
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — PAGES                                             │
│                                                              │
│  features/*/pages/*.tsx                                      │
│                                                              │
│  - Render UI and handle user interactions                    │
│  - Read state, call service functions, update local state    │
│  - Never call fetch() or apiClient directly                  │
└───────────────────────────┬──────────────────────────────────┘
                            │ calls
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2 — SERVICES                                          │
│                                                              │
│  features/*/services/*.service.ts                            │
│                                                              │
│  - TODAY: return mock data matching API contract shapes      │
│  - LATER: swap mock for real apiClient call (one line)       │
│  - Always return the same TypeScript type either way         │
│  - No JSX, no UI concerns                                    │
└───────────────────────────┬──────────────────────────────────┘
                            │ calls
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 3 — API CLIENT                                        │
│                                                              │
│  shared/lib/apiClient.ts                                     │
│                                                              │
│  - Single fetch wrapper used by all services                 │
│  - Attaches JWT token from localStorage to every request     │
│  - Sets base URL (/api/v1)                                   │
│  - Handles 401 / error responses in one place                │
│  - Exposes: get, post, put, patch, delete                    │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 4 — TYPES                                             │
│                                                              │
│  shared/types/api.types.ts                                   │
│                                                              │
│  - TypeScript interfaces mirroring API_CONTRACTS.md exactly  │
│  - Shared contract between frontend and backend              │
│  - If backend changes a response shape, TS catches it here   │
│  - No runtime code — types only                              │
└──────────────────────────────────────────────────────────────┘
```

### The Core Rule

> Pages never call `fetch`.
> Services never render UI.
> Types are the contract between both sides.

---

## Frontend ↔ Backend Integration Flow

```text
FRONTEND (Vite dev: localhost:5173)       BACKEND (NestJS: localhost:3000)

LoginPage
  │
  │  calls login(email, password)
  ▼
auth.service.ts
  │
  │  POST /api/v1/auth/login         ──▶  auth.controller.ts
  │                                            │
  │  ◀── { accessToken, user } ─────────────  auth.service.ts
  │                                            │
  │  stores token → localStorage              └── PrismaService ──▶ Supabase
  │
  ▼
apiClient.ts
  All future requests include:
  Authorization: Bearer <token>
```

---

## Mock → Real Swap

Services are written today with mock data. When the backend is ready, only the
service function body changes. Pages, types, and the API client are untouched.

```text
TODAY (mock)                              WHEN BACKEND IS READY

// auth.service.ts                        // auth.service.ts
return MOCK_USERS[data.email];            return apiClient.post<LoginResponse>(
                                            '/auth/login', data
                                          );
```

Every service function has the real call commented out directly below the mock,
so the swap is a one-line change per function.

---

## Service Files — Coverage

| Service | Functions |
|---|---|
| `auth.service.ts` | `login()`, `getCurrentUser()`, `logout()` |
| `employees.service.ts` | `listEmployees()`, `getEmployee()`, `createEmployee()`, `updateEmployee()`, `deactivateEmployee()` |
| `availability.service.ts` | `submitAvailability()`, `updateAvailability()`, `getEmployeeAvailability()`, `getWeeklyAvailability()` |
| `shifts.service.ts` | `listShifts()`, `createShift()`, `updateShift()`, `deleteShift()` |
| `schedules.service.ts` | `getWeeklySchedule()`, `createDraftSchedule()`, `addAssignment()`, `removeAssignment()`, `replaceAssignment()`, `approveSchedule()`, `rejectSchedule()`, `publishSchedule()`, `getMyRoleSchedule()` |

---

## UI Decisions

| Decision | Rationale |
|---|---|
| `StatusBar` not rendered on `LoginPage` | Login screen should not look like a phone screenshot; status bar (time, wifi, battery) is omitted |
| Logo tagline is "Shift planning app" | Concise branding; replaces earlier "Shift planning & team scheduling" |
| Logo `a.` optically centered via `position: relative; top: -3px` | Playfair Display has built-in descender space that shifts the glyph above true center; the offset corrects it visually |

---

## Sign Out / Session

- `logout()` in `auth.service.ts` calls `clearToken()` which removes the JWT from `localStorage`
- ProfilePage calls `logout()` then navigates to `/login` via React Router
- Manager profile shows **Sign Out** button
- Employee profile shows **Switch Demo User** button (same behaviour — clears token + redirects)

---

## Backend Module Structure

Each backend module contains:

```text
module-name/
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.module.ts
├── dto/
└── tests/
```

### Backend Dependency Rules

Allowed:

```text
Controller → Service → PrismaService
```

Not allowed:

```text
Controller → PrismaService directly
```

Controllers handle:

* Routing
* Guards
* Request validation
* Calling services
* Returning responses

Services handle:

* Business logic
* Authorization-sensitive decisions
* Database calls through Prisma
* Transaction boundaries

---

## MVP Modules

### auth

Handles login, JWT generation/validation, current user lookup, auth guards.
No public self-registration — accounts created by ADMIN or MANAGER only.

### users

Rules:

* Only `ADMIN` can create `MANAGER` accounts.
* `ADMIN` and `MANAGER` can create `EMPLOYEE` accounts.
* `EMPLOYEE` cannot create accounts.
* `MANAGER` cannot create another `MANAGER`.

### employees

Profile includes: first name, last name, email, phone, employment type, employee role, weekly hour limit, active status.

Supported scheduling roles: `WAITER` | `RUNNER` | `BARTENDER`

### availability

Employees submit and update their own availability before a deadline.
Managers and admins can view all employee availability.

### shifts

Each shift has: date, start time, end time, employee role, required count.

### schedules

Manual draft creation → assignment → approval → publishing.
Published schedule visible to employees for their own role only.

---

## Future Modules (deferred from MVP)

* leave
* swaps (backend — frontend shell already built)
* holidays
* notifications
* reporting

---

## System Roles

* `ADMIN` — full access, creates MANAGER accounts
* `MANAGER` — manages employees, shifts, schedules
* `EMPLOYEE` — submits availability, views published schedule for own role only

---

## Schedule Lifecycle

```text
DRAFT → APPROVED → PUBLISHED
              └──→ REJECTED
```

* `DRAFT` — visible to ADMIN + MANAGER only, editable
* `APPROVED` — visible to ADMIN + MANAGER only, not editable
* `PUBLISHED` — visible to all; employees see only their own role's assignments

---

## Manual Scheduling Rules

Assignment must respect: employee role match, availability, weekly hour limit, no shift overlap.

Not in MVP: auto-generation, fairness optimization, payroll, leave-aware or holiday-aware scheduling.

---

## Deferred Features

Auto schedule generation, leave, swaps (backend), holidays, notifications (push/email/in-app),
payroll, labor cost forecasting, reporting, multi-location.

---

## Prisma Rules

* UUID primary keys
* Migrations for all schema changes — never edit old migration files
* Transactions for multi-write operations

---

## Error Handling

Global exception filter on backend. Standard error shape:

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Email is required" }]
}
```

Frontend catches errors in the service layer. Pages receive either data or a thrown error matching this shape.

---

## Testing Strategy

Use Vitest.

* Service unit tests — mock data, correct shapes, error codes
* Component tests — rendering, interactions, conditional UI
* Page integration tests — full user flows within a page
* Routing tests — correct redirects, role-based access
* Auth flow tests — login, logout, token handling
* Backend: controller, service, validation, authorization tests
