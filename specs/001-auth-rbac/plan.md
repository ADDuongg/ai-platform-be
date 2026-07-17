# Implementation Plan: Authentication & Authorization (Auth + RBAC)

**Branch**: `001-auth-rbac` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-rbac/spec.md`

## Summary

Deliver Platform identity and access control before Workflow/Agent/Execution APIs open: email/password sign-in with access JWT (response body) + rotating refresh token (HTTP-only cookie), admin/invite-only user provisioning (default `viewer`), normalized RBAC with permission-based API guards, login lockout, auth rate limits, and minimal auth audit logging. Build on the existing NestJS scaffold (`AuthModule`, `UsersModule`, global `JwtAuthGuard`/`RolesGuard`, Redis, Throttler) by replacing denormalized `users.roles` with join tables and adding `PermissionsGuard`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, Passport JWT, TypeORM 0.3, PostgreSQL, Redis (ioredis), `@nestjs/throttler`, `argon2` (new), `cookie-parser` (new)

**Storage**: PostgreSQL (users, roles, permissions, refresh_tokens, auth_audit_logs); Redis (login lockout counters, optional access-token `jti` blacklist on logout)

**Testing**: Jest unit + Nest e2e (`test/jest-e2e.json`)

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service (NestJS monolith, domain modules)

**Performance Goals**: Interactive auth flows complete under 30s (SC-001); auth endpoints remain usable under global + stricter route throttles

**Constraints**: Repository pattern (no Active Record); permission checks at API boundary; no public self-registration; passwords never in responses/logs; refresh only via HTTP-only cookie; Workflow modules must depend only on shared guards/decorators

**Scale/Scope**: Phase 1 foundation — 5 roles, full permission matrix seed, auth + users + roles/permissions admin APIs; SSO/MFA/multi-tenant out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is still a placeholder template. Gates applied from PRD/ARCHITECTURE + engineering conventions in the repo:

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven platform; no hard-coded business workflows in auth | Pass | Auth is cross-cutting infrastructure |
| Domain modules + Repository pattern | Pass | Extend `modules/auth`, `modules/users`; new RBAC entities via repositories |
| Permission-based authorization (not role hard-coding in services) | Pass | Add `PermissionsGuard` + `@Permissions()`; keep `@Roles` only where needed for bootstrap |
| Soft delete for users | Pass | Existing `BaseEntity.deletedAt` |
| Secrets never logged/returned | Pass | Hash passwords (argon2); hash refresh tokens at rest |
| Reuse existing infra (JWT config, Redis, Throttler, guards) | Pass | No parallel auth stack |
| Out of scope respected (SSO, MFA, multi-tenant, ABAC) | Pass | Documented in spec |

**Post–Phase 1 re-check**: Pass — data model and contracts stay within Auth/Users modules; no Workflow Engine coupling.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-rbac/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── common/
│   ├── constants/          # roles, permissions (expand matrix)
│   ├── decorators/         # + permissions.decorator
│   ├── guards/             # + permissions.guard; tighten jwt/roles
│   └── config/             # jwt, throttle, cookie/auth settings
├── infrastructure/
│   └── database/
│       ├── migrations/     # RBAC + refresh + audit; alter users
│       └── seeds/          # roles, permissions, bootstrap super_admin
├── modules/
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/       # login, refresh, logout, password, audit
│   │   ├── strategies/
│   │   ├── dto/
│   │   ├── entities/       # refresh_token, auth_audit_log (or under auth/)
│   │   └── repositories/
│   └── users/
│       ├── controllers/    # list/create/update/roles
│       ├── services/
│       ├── entities/       # user (+ remove simple-array roles)
│       ├── repositories/
│       └── dto/
└── shared/                 # export guards/decorators if needed by future modules

test/
└── e2e/                    # auth + rbac flows
```

**Structure Decision**: Stay in the existing NestJS domain-module layout. Auth owns sessions/tokens/audit; Users owns account lifecycle and role assignment; shared guards/decorators live under `src/common` for global `APP_GUARD` registration. No new top-level app package.

## Complexity Tracking

> No constitution violations requiring justification. Normalized RBAC (vs keeping `users.roles` simple-array) is required by the backlog/spec and is not optional complexity.
