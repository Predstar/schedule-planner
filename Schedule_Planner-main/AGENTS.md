# AGENTS.md

## Project Overview

Restaurant Shift Scheduling Application.

This application helps restaurant managers manage employees, availability, shifts, schedules, leave requests, shift swaps, holidays, and notifications.

## Technology Stack

* Java 21
* Spring Boot 4
* PostgreSQL
* Spring Data JPA
* Spring Security
* Maven
* Flyway
* MapStruct
* JUnit 5
* Mockito
* Testcontainers

## Required Documentation

Before implementing or modifying code, read:

* docs/SRS.md
* docs/ARCHITECTURE.md
* docs/API_CONTRACTS.md

## Documentation Update Rule

If any approved change affects code behavior, business rules, APIs, security rules, scheduling rules, database structure, or architecture, update the relevant documentation in the same task.

Relevant docs may include:

- docs/ARCHITECTURE.md
- docs/API_CONTRACTS.md

Do not update docs for unapproved ideas or temporary experiments.
Only update docs after the rule or code change is approved.

## Architecture Rules

Use modular feature-based architecture.

Each module should follow this structure:

```text
module-name/
├── controller
├── service
├── repository
├── entity
├── dto
├── mapper
└── exception
```

Current modules:

* auth
* employee
* availability
* shift
* schedule
* leave
* swap
* holiday
* notification

Dependency flow must be:

```text
Controller → Service → Repository
```

Never do:

```text
Controller → Repository
Controller → Entity
```

## Coding Standards

* Use constructor injection only.
* Do not use field injection.
* Use Java records for request and response DTOs.
* Keep business logic in service classes.
* Controllers should only handle HTTP mapping, validation, authentication context, and response mapping.
* Use `@Transactional` only in service classes.
* Use `@Transactional(readOnly = true)` for read-only service methods.
* Use `@RestControllerAdvice` for global exception handling.
* Use UUID as the primary key type.
* Never expose JPA entities directly through APIs.
* Use DTOs for all external API communication.
* Do not create separate DTO classes when they represent the same business object and contain the same fields. Reuse the existing DTO instead.
* Use MapStruct for entity/DTO mapping.
* Do not introduce new libraries without approval.
* Do not implement more than one feature at a time.
* Do not modify unrelated modules unless explicitly required.

## Account Creation Rules

This application does not support public self-registration.

Employees cannot create their own accounts.

Only `ADMIN` can create `MANAGER` accounts.

Only `ADMIN` and `MANAGER` can create `EMPLOYEE` accounts.

A `MANAGER` cannot create another `MANAGER`.

## API Rules

* All APIs must use the `/api/v1` prefix.
* Before creating or changing endpoints, check `docs/API_CONTRACTS.md`.
* When adding or changing endpoints, update `docs/API_CONTRACTS.md`.
* APIs must return DTOs, not entities.
* Use consistent error responses.

## Security Rules

System roles:

* ADMIN
* MANAGER
* EMPLOYEE

Access rules:

* Employees can log in.
* Employees can view only their own published schedules.
* Employees can submit and update their own availability before the deadline.
* Employees can request leave and shift swaps.
* Employees cannot create accounts.
* Employees cannot view draft or approved schedules.
* Employees cannot generate, approve, publish, or manually edit schedules.
* Managers can create and manage employee profiles.
* Managers can generate draft schedules.
* Managers can manually edit draft schedules.
* Managers can approve and publish schedules.
* Managers can approve leave requests and shift swaps.
* Administrators can create manager accounts, create employee accounts, manage users, and manage system settings.

## Schedule Visibility Rules

`DRAFT` schedules:

- Visible only to `ADMIN` and `MANAGER`.
- Can be manually edited by `MANAGER`.

`APPROVED` schedules:

- Visible only to `ADMIN` and `MANAGER`.
- Not visible to employees.

`PUBLISHED` schedules:

- Visible to `ADMIN`, `MANAGER`, and `EMPLOYEE`.

Employee schedule visibility:

- Employees can view published schedules for their own employee role.
- A `WAITER` can view the published waiter schedule.
- A `RUNNER` can view the published runner schedule.
- A `BARTENDER` can view the published bartender schedule.
- Employees cannot view schedules for other employee roles.
- Employees cannot view draft or approved schedules.

## Supported Scheduling Roles

The scheduling engine currently supports only these employee roles:

* WAITER
* RUNNER
* BARTENDER

Do not introduce skill-based scheduling.

Do not introduce additional scheduling roles unless explicitly requested.

## Scheduling Rules

The scheduling engine must always respect:

* Employee availability
* Employee role
* Weekly hour limits
* No overlapping shifts
* Minimum rest periods
* Leave requests
* Holiday rules
* Fair shift distribution

Do not implement skill-based scheduling unless explicitly requested.

## Database Rules

* Database is PostgreSQL.
* Use Flyway for schema migrations.
* Never modify existing migration files.
* Create a new migration for every schema change.
* Before creating a new entity, verify it does not already exist.

## Testing Rules

Write tests for every feature.

Unit tests:

* JUnit 5
* Mockito
* Service-layer focused

Integration tests:

* Spring Boot Test
* Testcontainers
* PostgreSQL container

Every feature must include:

* Happy path tests
* Validation tests
* Error tests
* Security tests
* Edge-case tests

Before considering a task complete, run:

```bash
mvn test
```

## Feature Development Process

Implement only one roadmap phase at a time.

Current development order:

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

Do not skip phases.

## Preferred Implementation Workflow

For each feature:

1. Read the relevant documentation.
2. Propose the design.
3. List test cases.
4. Implement entity, repository, and migration if needed.
5. Implement service tests.
6. Implement service logic.
7. Implement controller and DTOs.
8. Implement integration tests.
9. Run tests.
10. Summarize changes.

## Output Expectations

For every task, provide:

* Summary
* Files changed
* Tests added
* Assumptions
* Verification result for `mvn test`
