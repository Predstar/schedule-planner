# ARCHITECTURE.md

## Application

Restaurant Shift Scheduling Application.

The application helps restaurant managers manage employees, weekly availability, shifts, schedules, leave requests, shift swaps, holidays, and notifications.

## Technology Stack

* Java 21
* Spring Boot 3
* PostgreSQL
* Spring Data JPA
* Spring Security
* Maven
* Flyway
* MapStruct
* JUnit 5
* Mockito
* Testcontainers

## Architecture Style

The project follows a modular feature-based architecture.

Each business context owns its own controller, service, repository, entity, DTOs, mapper, and exceptions.

## Package Structure

```text
com.example.schedule_planner
├── auth
│   ├── controller
│   ├── service
│   ├── repository
│   ├── entity
│   ├── dto
│   ├── mapper
│   └── exception
│
├── employee
│   ├── controller
│   ├── service
│   ├── repository
│   ├── entity
│   ├── dto
│   ├── mapper
│   └── exception
│
├── availability
├── shift
├── schedule
├── leave
├── swap
├── holiday
├── notification
│
└── common
    ├── config
    ├── security
    ├── exception
    ├── response
    └── util
```

## Core Modules

### auth

Handles login, current user profile, roles, permissions, and authentication security.

This application does not support public self-registration.

Only administrators can create manager accounts.

Managers and administrators can create employee accounts.

Auth persists user accounts in a dedicated `users` table.

UC-01 login currently authenticates by email and password, then returns a signed JWT bearer token.

JWT generation is handled inside the auth module.

The token currently carries authenticated identity, employee link, and role claims.

Bearer token authentication is currently implemented for auth-protected endpoints such as `GET /api/v1/auth/me`.

Each user account contains:

* UUID id
* unique email
* password hash
* system role (`ADMIN`, `MANAGER`, `EMPLOYEE`)
* optional employee link for employee accounts
* active flag

### employee

Handles employee profile management, employee type, employee role, hourly rate, and weekly hour limits.

Supported scheduling employee roles:

* WAITER
* RUNNER
* BARTENDER

### availability

Handles weekly employee availability, preferred shifts, unavailable days, and availability submission deadlines.

### shift

Handles shift creation, shift updates, manual shift assignment, and overlap prevention.

Each shift has one required employee role and required employee count.

The scheduling engine assigns employees based on role, not skills.

### schedule

Handles draft schedule generation, manual draft editing, review, approval, publishing, and schedule viewing.

Employees cannot view draft or approved schedules.

Employees can view only published schedules and only their own assigned shifts.

### leave

Handles vacation and sick leave requests, approval, rejection, and scheduling blocks.

### swap

Handles employee shift swap requests, coworker acceptance, manager approval, and constraint validation.

### holiday

Handles country-specific public holiday configuration and holiday-aware staffing adjustments.

### notification

Handles schedule publication alerts, shift reminders, availability reminders, and shift change notifications.

## Dependency Rules

Allowed flow:

```text
Controller → Service → Repository
```

Not allowed:

```text
Controller → Repository
Controller → Entity
```

Controllers must only handle HTTP request mapping, validation, authentication context, and response conversion.

Services contain business logic and transaction boundaries.

Repositories only handle database access.

Entities must never be exposed directly through APIs.

DTOs must be used for all request and response payloads.

MapStruct should be used for entity/DTO mapping.

## Transaction Rules

Read-only service methods should use `@Transactional(readOnly = true)`.

Write service methods should use `@Transactional`.

Use transactions only in service classes.

## Account Creation Rules

Employees cannot create their own accounts.

Only `ADMIN` can create `MANAGER` accounts.

Only `ADMIN` and `MANAGER` can create `EMPLOYEE` accounts.

A `MANAGER` cannot create another `MANAGER`.

## Security Rules

System roles:

* ADMIN
* MANAGER
* EMPLOYEE

Access principles:

* `ADMIN` can create manager accounts, create employee accounts, manage users, and manage system settings.
* `MANAGER` can create and manage employee profiles.
* `MANAGER` can generate draft schedules.
* `MANAGER` can manually edit draft schedules.
* `MANAGER` can approve and publish schedules.
* `MANAGER` can approve leave requests and shift swaps.
* `EMPLOYEE` can submit availability, request leave, request shift swaps, and view notifications.
* `EMPLOYEE` can view only their own published schedule.
* `EMPLOYEE` cannot view draft or approved schedules.
* `EMPLOYEE` cannot create accounts.

## Schedule Lifecycle

Schedule statuses:

```text
DRAFT
APPROVED
PUBLISHED
```

Lifecycle:

```text
Generate Draft
→ Manager Reviews
→ Manager Manually Edits Draft
→ Manager Approves
→ Manager Publishes
→ Employees Can View Published Schedule
```

`DRAFT` schedule:

* Visible only to `ADMIN` and `MANAGER`.
* Editable by `MANAGER`.

`APPROVED` schedule:

* Visible only to `ADMIN` and `MANAGER`.
* Not visible to employees.

`PUBLISHED` schedule:

- Visible to `ADMIN`, `MANAGER`, and `EMPLOYEE`.
- `ADMIN` and `MANAGER` can view the full published schedule.
- Employees can view the published schedule for their own employee role.
- `WAITER` employees can view all published `WAITER` assignments.
- `RUNNER` employees can view all published `RUNNER` assignments.
- `BARTENDER` employees can view all published `BARTENDER` assignments.
- Employees cannot view published schedules for other employee roles.

## Scheduling Rules

The scheduling engine must respect:

* Employee availability
* Employee role
* Weekly hour limits
* No overlapping shifts
* Minimum rest periods
* Leave requests
* Holiday rules
* Fair shift distribution

The scheduling engine currently supports only:

* WAITER
* RUNNER
* BARTENDER

Skill-based scheduling is intentionally excluded from the MVP.

Shift assignment is based on employee role, not employee skills.

## Manual Schedule Editing Rules

Managers can manually edit draft schedules before approval.

Allowed manual edits:

* Add employee assignment to a shift.
* Remove employee assignment from a shift.
* Replace assigned employee.
* Update shift time.
* Update required employee count.

Manual edits must still respect:

* Employee role
* Employee availability
* No overlapping shifts
* Weekly hour limits
* Leave requests

## Database Rules

* PostgreSQL is the primary database.
* UUID is used as the primary key type.
* Flyway is used for schema migrations.
* Existing migration files must never be modified.
* Every schema change requires a new migration.

## Error Handling

Use a global exception handler with `@RestControllerAdvice`.

Standard error response:

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "status": 400,
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

Each feature should include:

* Unit tests for service logic
* Repository tests with Testcontainers PostgreSQL
* API integration tests with Spring Boot Test
* Security tests
* Validation tests
* Error tests
* Edge-case tests

## Development Order

1. Authentication and roles
2. Employee management
3. Availability management
4. Manual shift scheduling
5. Automatic schedule generation MVP
6. Scheduling constraints
7. Schedule approval and publishing
8. Leave management
9. Shift swaps
10. Holiday management
11. Notifications
12. Reporting and optimization
