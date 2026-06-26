# ARCHITECTURE.md

## Application

Restaurant Shift Scheduling Application.

This is a web-based scheduling application for restaurants.

The MVP focuses on manual scheduling first, not automatic optimization.

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

## Technology Stack

* React + Vite frontend
* TypeScript
* Node.js
* NestJS backend
* Prisma ORM
* Supabase PostgreSQL
* JWT Authentication
* Vitest

## Project Structure

```text
restaurant-scheduler/
├── AGENTS.md
├── docs/
│   ├── ARCHITECTURE.md
│   └── API_CONTRACTS.md
│
├── frontend/
│   └── React + Vite application
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

Each backend module should generally contain:

```text
module-name/
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.module.ts
├── dto/
└── tests/
```

## Backend Dependency Rules

Allowed:

```text
Controller → Service → PrismaService
```

Not allowed:

```text
Controller → PrismaService
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

Availability submission deadline rule:

* Deadline = `weekStartDate` minus 2 days, at `00:00`, in the `Europe/Berlin` timezone.
* This deadline applies only to `EMPLOYEE` self-service submission and updates.
* `ADMIN` and `MANAGER` are exempt from the deadline and may submit or update availability on an employee's behalf at any time.

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

## Future Modules

These are intentionally excluded from the MVP:

* leave
* swaps
* holidays
* notifications
* reporting

They may be added after the core scheduling flow works.

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

## Schedule Lifecycle

Schedule statuses:

```text
DRAFT
APPROVED
REJECTED
PUBLISHED
```

Lifecycle:

```text
Create Draft Schedule
→ Manager Adds/Edits Assignments
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
* Employees can view the published schedule for their own employee role.
* `WAITER` employees can view all published `WAITER` assignments.
* `RUNNER` employees can view all published `RUNNER` assignments.
* `BARTENDER` employees can view all published `BARTENDER` assignments.
* Employees cannot view published schedules for other roles.

## Manual Scheduling Rules

The MVP uses manual scheduling.

Managers manually assign employees to shifts.

Manual assignment must respect:

* Employee role
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

## Prisma Rules

Use Prisma as the database access layer.

Use Prisma migrations for schema changes.

Use UUID primary keys.

Do not manually edit old migration files.

Use Prisma transactions when multiple related writes must succeed or fail together.

## Error Handling

Use a global exception filter.

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

## Testing Strategy

Use Vitest.

Test categories:

* Service unit tests
* Controller tests
* Validation tests
* Authorization tests
* Important integration tests
