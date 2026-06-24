# ARCHITECTURE_v1.md

> Version 1 — expanded to include frontend layer architecture and frontend ↔ backend integration design.
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

* React + Vite frontend
* TypeScript
* Node.js
* NestJS backend
* Prisma ORM
* Supabase PostgreSQL
* JWT Authentication
* Vitest

---

## Project Structure

```text
Schedule_Planner/
├── docs/
│   ├── ARCHITECTURE.md         — original system architecture
│   ├── ARCHITECTURE_v1.md      — this file (frontend layers + integration)
│   └── API_CONTRACTS.md        — API request/response shapes
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── App.tsx               — routing only, no business logic
│       │   └── styles.css
│       │
│       ├── shared/
│       │   ├── components/           — PhoneShell, StatusBar, BottomNav
│       │   ├── lib/
│       │   │   └── apiClient.ts      — base HTTP client, token attachment
│       │   ├── types/
│       │   │   └── api.types.ts      — TypeScript types mirroring API_CONTRACTS.md
│       │   └── utils/
│       │
│       └── features/
│           ├── auth/
│           │   ├── pages/            — LoginPage
│           │   ├── services/         — auth.service.ts
│           │   └── types/
│           ├── employees/
│           │   ├── pages/            — ManagerTeamPage
│           │   ├── services/         — employees.service.ts
│           │   └── types/
│           ├── schedules/
│           │   ├── pages/            — ManagerDashboardPage
│           │   ├── services/         — schedules.service.ts
│           │   └── types/
│           ├── shifts/
│           │   └── services/         — shifts.service.ts
│           ├── availability/
│           │   ├── pages/            — AvailabilityPage (shared manager + employee)
│           │   └── services/         — availability.service.ts
│           └── profile/
│               └── pages/            — ProfilePage (shared manager + employee)
│
└── backend/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    │
    └── src/
        ├── auth/
        ├── users/
        ├── employees/
        ├── availability/
        ├── shifts/
        ├── schedules/
        ├── prisma/
        ├── shared/
        ├── app.module.ts
        └── main.ts
```

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

Every service function follows this pattern — the commented-out real call sits
directly below the mock so the swap is a one-line change per function.

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

Handles:

* Login
* Password validation
* JWT generation
* JWT validation
* Current user lookup
* Auth guards

The application does not support public self-registration.

### users

Handles system user accounts.

Rules:

* Only `ADMIN` can create `MANAGER` accounts.
* `ADMIN` and `MANAGER` can create `EMPLOYEE` accounts.
* `EMPLOYEE` cannot create accounts.
* `MANAGER` cannot create another `MANAGER`.

### employees

Handles employee profiles.

Employee profile includes:

* First name
* Last name
* Email
* Phone
* Employment type
* Employee role
* Weekly hour limit
* Active status

Employee profile does not include:

* Hourly rate
* Salary
* Payroll data
* Labor cost data

Supported scheduling roles:

* WAITER
* RUNNER
* BARTENDER

### availability

Handles weekly employee availability.

Employees can submit and update their own availability before the deadline.

Managers and admins can view employee availability.

### shifts

Handles shift creation and shift requirements.

Each shift has:

* Date
* Start time
* End time
* Employee role
* Required count

### schedules

Handles:

* Manual draft schedule creation
* Manual assignment of employees to shifts
* Draft review
* Schedule approval
* Schedule publishing
* Published schedule viewing by employee role

---

## Future Modules

These are intentionally excluded from the MVP:

* leave
* swaps
* holidays
* notifications
* reporting

They may be added after the core scheduling flow works.

---

## System Roles

System roles:

* ADMIN
* MANAGER
* EMPLOYEE

Access principles:

* `ADMIN` can create manager accounts, create employee accounts, manage users, and manage settings.
* `MANAGER` can create and manage employee profiles.
* `MANAGER` can create shifts.
* `MANAGER` can manually create and edit draft schedules.
* `MANAGER` can approve and publish schedules.
* `EMPLOYEE` can submit availability.
* `EMPLOYEE` can view only published schedules for their own employee role.
* `EMPLOYEE` cannot view draft or approved schedules.
* `EMPLOYEE` cannot create accounts.

---

## Schedule Lifecycle

Schedule statuses:

```text
DRAFT → APPROVED → PUBLISHED
              └──→ REJECTED
```

Lifecycle:

```text
Manager Creates Draft Schedule
  → Manager Adds / Edits Assignments
  → Manager Approves
  → Manager Publishes
  → Employees View Published Schedule For Their Role
```

`DRAFT` schedule:

* Visible only to `ADMIN` and `MANAGER`.
* Editable by `MANAGER`.

`APPROVED` schedule:

* Visible only to `ADMIN` and `MANAGER`.
* Not visible to employees.

`PUBLISHED` schedule:

* Visible to `ADMIN`, `MANAGER`, and `EMPLOYEE`.
* `ADMIN` and `MANAGER` can view the full schedule.
* `WAITER` employees see only published WAITER assignments.
* `RUNNER` employees see only published RUNNER assignments.
* `BARTENDER` employees see only published BARTENDER assignments.
* Employees cannot view published schedules for other roles.

---

## Manual Scheduling Rules

The MVP uses manual scheduling.

Managers manually assign employees to shifts.

Manual assignment must respect:

* Employee role matches shift role
* Employee availability
* Weekly hour limits
* No overlapping shifts

The MVP does not include:

* Automatic schedule generation
* Fairness optimization
* Payroll optimization
* Holiday-aware scheduling
* Leave-aware scheduling
* Shift swap validation

---

## Deferred Features

The following features are future enhancements:

* Automatic schedule generation
* Leave management
* Shift swaps
* Holiday calculation
* In-app notifications
* Email notifications
* Push notifications
* Payroll
* Labor cost forecasting
* Reporting
* Multi-location support

---

## Prisma Rules

Use Prisma as the database access layer.

Use Prisma migrations for schema changes.

Use UUID primary keys.

Do not manually edit old migration files.

Use Prisma transactions when multiple related writes must succeed or fail together.

---

## Error Handling

Use a global exception filter on the backend.

Standard error response:

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

Frontend handles errors in the service layer. Pages receive either data or a
thrown error object matching this shape.

---

## Testing Strategy

Use Vitest.

Test categories:

* Service unit tests — mock data, correct shapes, error codes
* Component tests — rendering, interactions, conditional UI
* Page integration tests — full user flows within a page
* Routing tests — correct redirects, role-based access
* Auth flow tests — login, logout, token handling
* Backend: controller, service, validation, authorization tests
