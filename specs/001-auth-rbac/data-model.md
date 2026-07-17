# Data Model: Authentication & Authorization (Auth + RBAC)

**Feature**: `001-auth-rbac` | **Date**: 2026-07-14

## Entities

### User

Platform account.

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| email | string | unique among non-deleted; lowercase normalize |
| password_hash | string | argon2id; never selected by default |
| first_name | string | optional/required per DTO validation |
| last_name | string | optional/required per DTO validation |
| status | enum | `active` \| `inactive` \| `suspended` \| `pending` |
| last_login_at | timestamptz | nullable |
| failed_login_count | int | optional denorm; lockout primary in Redis |
| created_at / updated_at / deleted_at | timestamptz | soft delete |

**Relationships**: many-to-many → Role via `user_roles`.

**State transitions (status)**:
- `pending` → `active` (admin activate)
- `active` → `inactive` | `suspended`
- `inactive` | `suspended` → `active` (admin)
- any → soft-deleted (`deleted_at` set) → cannot sign in

**Sign-in eligibility**: `status === active` AND `deleted_at IS NULL` AND not lockout-blocked.

**Remove**: `users.roles` simple-array column (replaced by `user_roles`).

---

### Role

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| code | string | unique; `super_admin`, `admin`, `designer`, `operator`, `viewer` |
| name | string | display name |
| description | string | nullable |
| created_at / updated_at | timestamptz | |

**Relationships**: M2M User; M2M Permission via `role_permissions`.

---

### Permission

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| code | string | unique; format `resource:action` |
| resource | string | e.g. `users`, `workflows` |
| action | string | e.g. `read`, `execute`, `manage` |
| description | string | nullable |

---

### UserRole

| Field | Type | Rules |
|-------|------|--------|
| user_id | uuid | FK → users, PK composite |
| role_id | uuid | FK → roles, PK composite |
| assigned_at | timestamptz | default now |
| assigned_by | uuid | nullable FK → users |

**Default on create**: if no roles provided → assign `viewer`.

---

### RolePermission

| Field | Type | Rules |
|-------|------|--------|
| role_id | uuid | FK → roles |
| permission_id | uuid | FK → permissions |
| PK | (role_id, permission_id) | |

---

### RefreshToken

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| token_hash | string | unique; SHA-256 of opaque token |
| family_id | uuid | rotation family |
| expires_at | timestamptz | |
| revoked_at | timestamptz | nullable |
| replaced_by_id | uuid | nullable FK → refresh_tokens |
| user_agent | string | nullable |
| ip | string | nullable |
| created_at | timestamptz | |

**Lifecycle**: issued → rotated (revoked + replaced) → expired / family-revoked on reuse.

---

### AuthAuditLog

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| user_id | uuid | nullable (unknown email login fail) |
| event | string | `login_success`, `login_fail`, `logout`, `logout_all`, `password_change`, `role_change`, `refresh_reuse` |
| meta | jsonb | minimal: ip, userAgent, targetUserId — no secrets |
| created_at | timestamptz | append-only |

---

### PasswordResetToken (MVP stub)

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| user_id | uuid | FK |
| token_hash | string | unique |
| expires_at | timestamptz | short TTL (e.g. 1h) |
| used_at | timestamptz | nullable |
| created_at | timestamptz | |

## Seed data

### Roles

`super_admin`, `admin`, `designer`, `operator`, `viewer`

### Permissions (Phase 1 codes)

- `users:create|read|update|delete`
- `roles:manage`
- `workflows:create|read|update|delete|execute|publish`
- `agents:create|read|update|delete|publish`
- `prompts:create|read|update|delete|publish`
- `tools:create|read|update|delete`
- `executions:create|read|cancel|retry`

### Default matrix

Per BACKLOG.md Default Role → Permission table:
- `super_admin`: all permissions (or implicit `*:manage` equivalent by assigning full set)
- `admin`: users CRUD; workflows/agents/prompts/tools CRUD+publish; executions; workflows execute; no `roles:manage`
- `designer`: workflows CRUD+publish+execute; agents/prompts/tools read (+assign as needed); executions create/cancel/retry/read
- `operator`: workflows read+execute; agents/prompts/tools read; executions create/cancel/retry/read
- `viewer`: read-only on workflows/executions/agents/prompts/tools metadata

### Bootstrap user

Env-driven `super_admin` user created/updated by seed if missing.

## Validation rules (domain)

- Email unique among non-deleted users
- Password min length ≥ 8 (DTO); complexity policy configurable
- Cannot remove last active `super_admin`
- Non–super_admin cannot assign `super_admin` role
- Soft-deleted users excluded from default listings
