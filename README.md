# Restaurant Scheduler

Restaurant shift scheduling MVP with a separated frontend/backend architecture.

## Structure

```text
restaurant-scheduler/
├── docs/
├── frontend/
└── backend/
```

## Dependency Manager

This repository uses `pnpm` workspaces.

## Development

Install workspace dependencies:

```bash
pnpm install
```

Start the frontend:

```bash
pnpm --filter frontend dev
```

Start the backend:

```bash
pnpm --filter backend start:dev
```

Create the initial admin account through the backend:

```bash
cd backend
ADMIN_EMAIL="admin@restaurant.com" \
ADMIN_PASSWORD="change-me" \
ADMIN_FIRST_NAME="System" \
ADMIN_LAST_NAME="Admin" \
npm run create:admin
```
