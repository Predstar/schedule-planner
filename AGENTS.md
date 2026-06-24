# AGENTS.md

## Purpose

This file defines how Codex/AI agents should work in this repository.

Business rules and architecture belong in `docs/ARCHITECTURE.md`.

API request/response contracts belong in `docs/API_CONTRACTS.md`.

## Required Reading

Before implementing or modifying code, read:

* `docs/ARCHITECTURE.md`
* `docs/API_CONTRACTS.md`

## Documentation Priority

When documentation conflicts occur, follow this order:

1. `docs/API_CONTRACTS.md`
2. `docs/ARCHITECTURE.md`
3. `AGENTS.md`

## Documentation Update Rule

If an approved change affects business rules, APIs, security rules, scheduling rules, database structure, or architecture, update the relevant documentation in the same task.

Do not update docs for unapproved ideas or temporary experiments.

## Stack

* Frontend: React + Vite + TypeScript
* Backend: Node.js + NestJS + TypeScript
* ORM: Prisma
* Database: Supabase PostgreSQL
* Authentication: NestJS JWT
* Testing: Vitest for frontend, Jest or Vitest for backend

## Architecture Rules

Use separated frontend/backend architecture.

```text
frontend → backend API → Prisma → Supabase PostgreSQL
```

Do not call Supabase directly from the frontend.

Do not put business logic in the frontend.

Do not use Supabase RLS/RPC for business rules unless explicitly requested.

Backend dependency flow:

```text
Controller → Service → PrismaService
```

Do not access Prisma directly from controllers.

Do not implement more than one feature at a time.

Do not modify unrelated modules unless required.

## Coding Standards

* Use TypeScript strict mode.
* Use NestJS dependency injection.
* Keep business logic inside services.
* Controllers should only handle routing, guards, validation, and response mapping.
* Use DTO classes for request validation.
* Use Prisma for database access.
* Do not expose raw database models directly if the API contract requires a different shape.
* Avoid introducing new libraries without approval.

## DTO Rules

Do not create multiple DTOs with identical fields and identical meaning.

Reuse an existing DTO when:

* The fields are the same.
* The response meaning is the same.
* The visibility/security rules are the same.

Create a separate DTO only when:

* The endpoint needs different fields.
* The validation rules are different.
* The response meaning is different.
* The DTO is expected to evolve separately.
* Security/privacy requires hiding or exposing different data.

## Database Rules

* Use Supabase PostgreSQL as the database.
* Use Prisma schema and Prisma migrations.
* Do not manually edit existing migration files.
* Create a new migration for schema changes.
* Use UUID primary keys.

## Testing Rules

Use Vitest.

Every feature should include:

* Service unit tests
* Controller tests where useful
* Validation tests
* Authorization tests
* Error tests

Before considering a task complete, run:

```bash
npm test
```

## MVP Development Order

Implement features in this order:

1. Authentication and roles
2. User account management
3. Employee management
4. Availability management
5. Shift management
6. Manual draft scheduling
7. Schedule approval and publishing
8. Role-based published schedule view

## Preferred Codex Workflow

For every task:

1. Read the docs.
2. Explain the design first.
3. List files to create or modify.
4. List test cases.
5. Implement only the requested scope.
6. Add tests.
7. Run tests.
8. Summarize changes.

## Output Expectations

For every completed task, provide:

* Summary
* Files changed
* Tests added
* Assumptions
* Verification result
