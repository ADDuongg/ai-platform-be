# Tasks: Authentication & Authorization (Auth + RBAC)

**Input**: Design documents from `/specs/001-auth-rbac/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel  
- **[Story]**: User story (US1–US5)

---

## Phase 1: Setup

- [x] T001 Install `argon2`, `cookie-parser`, `@types/cookie-parser`; add bootstrap/auth env keys to `.env.example` and `env.validation.ts`
- [x] T002 [P] Expand `src/common/constants/roles.ts` and `permissions.ts` to Phase-1 matrix; add auth error codes
- [x] T003 [P] Add auth config (cookie name, lockout, refresh cookie flags) in `src/common/config/`

## Phase 2: Foundational (blocking)

- [x] T004 Create RBAC entities: `RoleEntity`, `PermissionEntity`, join entities under `src/modules/users/entities/` (or `rbac/`)
- [x] T005 Create `RefreshTokenEntity`, `AuthAuditLogEntity`, `PasswordResetTokenEntity` under `src/modules/auth/entities/`
- [x] T006 Migration: drop `users.roles`; create roles/permissions/joins/refresh_tokens/auth_audit_logs/password_reset_tokens
- [x] T007 Seed script: 5 roles + permission matrix + bootstrap `super_admin` (`src/infrastructure/database/seeds/`)
- [x] T008 [P] Password hashing util (`argon2id`) in `src/common/utils/password.util.ts`
- [x] T009 [P] `@Permissions()` decorator + `PermissionsGuard`; register global; update `JwtPayload` with `permissions` + `jti`
- [x] T010 Wire `cookie-parser` in `main.ts`; CORS already credentials-enabled

## Phase 3: US1 — Sign In & Session (P1)

- [x] T011 [US1] Auth repositories: refresh tokens, audit logs, password reset
- [x] T012 [US1] `AuthService`: login, refresh (rotate + reuse detection), logout, logout-all, me
- [x] T013 [US1] `AuthController` endpoints + DTOs + stricter `@Throttle` on login/refresh
- [x] T014 [US1] Update `JwtStrategy` validate payload (roles, permissions, jti); optional Redis jti blacklist on logout

## Phase 4: US2 — Permissions (P1)

- [x] T015 [US2] Users/roles services load effective permissions; JWT issue includes permission codes
- [x] T016 [US2] Migrate `UsersController` from `@Roles` to `@Permissions`; ensure health/docs stay `@Public`

## Phase 5: US3 — Provisioning & Self-Security (P2)

- [x] T017 [US3] `POST /users` create (default `viewer`); no public register
- [x] T018 [US3] Change password + forgot/reset password (stub mailer)

## Phase 6: US4 — Admin Users & Roles (P2)

- [x] T019 [US4] List/get/update/soft-delete users; patch user roles (`roles:manage`)
- [x] T020 [US4] List roles/permissions; put role permissions (`super_admin` / `roles:manage`)

## Phase 7: US5 — Lockout & Audit (P3)

- [x] T021 [US5] Redis login lockout + auth audit events on login/logout/password/role change

## Phase 8: Polish

- [x] T022 Unit tests for password util + auth service critical paths
- [x] T023 Update BACKLOG status → Implementing/Done; Swagger tags

## Dependencies

Setup → Foundational → US1 → US2 → US3/US4 → US5 → Polish

## Implementation strategy

User requested full module delivery; tasks executed as a single implementation pass with tests and backlog update.
