# AI Platform Backend

Enterprise NestJS foundation for a modern AI Platform.

## Quick start

```bash
pnpm install
docker compose up -d
pnpm migration:run
pnpm seed
pnpm start:dev
```

| Service   | URL / Port |
|-----------|------------|
| API       | http://localhost:3000/api/v1 (port from `APP_PORT` in `.env`) |
| Swagger   | http://localhost:3000/docs |
| Health    | http://localhost:3000/api/v1/health |
| Postgres  | `localhost:5433` (container `5432`) |
| Redis     | `localhost:6380` (container `6379`) |
| PgAdmin   | http://localhost:5050 |

PgAdmin: `admin@ai-platform.local` / `admin`

> Host ports `5433` / `6380` avoid clashes with local Postgres/Redis.
> Inside Docker / production, services still use `5432` / `6379`.
> API port is controlled by `APP_PORT` in `.env` (`.env.example` uses `3000`).

Requires **Node.js ≥ 20** and **pnpm ≥ 9** (`corepack enable` recommended).

## Seed data

After migrations, run:

```bash
pnpm seed
```

This runs `seed:rbac` (roles, permissions, bootstrap admin), `seed:agents` (sample agents), and `seed:workflows` (sample workflows including empty + research→review for Execution demos).

### Bootstrap admin (Auth)

Created from env `BOOTSTRAP_ADMIN_*` (see `.env.example`):

| Field | Default (dev) |
|-------|----------------|
| Email | `admin@ai-platform.local` |
| Password | `ChangeMe123!` |
| Role | `super_admin` |

Login: `POST /api/v1/auth/login` with `{ "email", "password" }`.

> Change the password in `.env` before the first seed. Set `BOOTSTRAP_ADMIN_RESET_PASSWORD=true` to reset the bootstrap user password when re-running seed.

### Sample agents (Agent Registry)

| Code | Name | Capability |
|------|------|------------|
| `research-agent` | Research | research |
| `review-agent` | Review | review |

Both are `published`, `enabled=true`, version 1.

### Sample workflows

| Code | Status | Version Status | Notes |
|------|--------|----------------|--------|
| `sample-empty-workflow` | DRAFT | DRAFT | Empty graph for Builder demo (build from scratch) |
| `sample-builder-demo` | DRAFT | DRAFT | research→review nodes for Builder demo (edit existing) |
| `sample-research-review` | PUBLISHED | PUBLISHED | research→review for Execution demo (immutable, executable) |

### Seeded roles

`super_admin`, `admin`, `designer`, `operator`, `viewer` — with the Phase 1 permission matrix.

There is no public self-registration; admins create users via `POST /api/v1/users`.

## Spec Kit (Spec-Driven Development)

Project đã được init với [GitHub Spec Kit](https://github.com/github/spec-kit) (`specify-cli` **v0.12.11**, integration `cursor-agent`).

Trong Cursor, dùng các skill:

| Skill | Mục đích |
|-------|----------|
| `/speckit-constitution` | Nguyên tắc dự án |
| `/speckit-specify` | Viết spec (what/why) |
| `/speckit-plan` | Kế hoạch kỹ thuật |
| `/speckit-tasks` | Chia task |
| `/speckit-implement` | Implement theo plan |
| `/speckit-clarify` / `analyze` / `checklist` | (optional) chất lượng spec |

Artifacts nằm ở `.specify/`; CLI: `specify version`, `specify self check`.

## Architecture

```
src/
  common/          # Cross-cutting: config, filters, guards, DTOs, utils
  infrastructure/  # Adapters: database, redis, queue, logger
  modules/         # Feature modules (auth, users, health, …)
  shared/          # Thin shared providers (keep minimal)
```

Feature modules are isolated. Infrastructure is injected via DI — never import TypeORM repositories into controllers.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm start:dev` | Watch mode |
| `pnpm build` | Compile + resolve path aliases |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm test` / `pnpm test:e2e` | Jest |
| `pnpm migration:*` | TypeORM migrations |
| `pnpm seed` | RBAC + sample agents (`seed:rbac`, `seed:agents`) |

## Conventions

- Repository (Data Mapper) pattern — no Active Record
- UUID PKs, soft delete, snake_case columns
- Global validation, exception filter, response envelope
- JWT auth scaffold (`@Public()`, `@Roles()`, `@CurrentUser()`)
- Env validated via Joi on boot
- Package manager: **pnpm** only (do not commit `package-lock.json`)
