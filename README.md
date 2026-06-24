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
