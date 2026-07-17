# Research: Authentication & Authorization (Auth + RBAC)

**Feature**: `001-auth-rbac` | **Date**: 2026-07-14

## R1 — Password hashing

**Decision**: Use `argon2` (argon2id) via the `argon2` npm package.

**Rationale**: Modern default for password hashing; stronger than bcrypt against GPU attacks; aligns with backlog (“argon2 or bcrypt”) and senior-be guidance.

**Alternatives considered**:
- `bcrypt` — acceptable, widely used; slightly weaker defaults; rejected in favor of argon2id.
- Plain crypto scrypt wrappers — more DIY surface; rejected.

## R2 — Refresh token transport & storage

**Decision**: Opaque refresh token in HTTP-only cookie (`Secure`, `HttpOnly`, `SameSite=Lax` in prod; configurable); store only SHA-256 hash in `refresh_tokens`. Access JWT in JSON body; clients send `Authorization: Bearer <access>`.

**Rationale**: Matches clarification (hybrid). Opaque refresh avoids embedding long-lived JWT in cookies; hashing at rest limits DB leak impact. Cookie reduces XSS token theft vs body storage.

**Alternatives considered**:
- Refresh JWT in body — simpler for non-browser clients; rejected by clarification.
- Cookie-only for both tokens — harder for non-browser API clients; rejected.

## R3 — Refresh rotation & reuse detection

**Decision**: Rotate refresh on every successful `/auth/refresh`. Persist `family_id` on refresh rows. If a previously rotated (or revoked) token hash is presented, revoke the entire family and force re-login.

**Rationale**: Spec edge case + backlog acceptance criteria. Family revoke mitigates stolen-token replay after rotation.

**Alternatives considered**:
- Rotate without reuse detection — simpler; weaker security; rejected.
- Absolute single-session only — poor UX for multi-device; rejected (logout-all covers intentional revoke).

## R4 — Access token claims & authorization source of truth

**Decision**: Access JWT includes `sub`, `email`, `roles[]`, `permissions[]` (or compact permission codes), and `jti`. `PermissionsGuard` checks required `@Permissions()` against request user permissions (from JWT). On sensitive role changes, existing access tokens remain valid until expiry; refresh reloads permissions from DB. Optional Redis blacklist of `jti` on logout for early access invalidation within TTL.

**Rationale**: Spec requires permission-based checks, not role hard-coding in business services. Embedding permissions avoids DB hit per request; short access TTL (15m) bounds stale permission window. Redis `jti` blacklist optional for logout hardening.

**Alternatives considered**:
- DB lookup every request — freshest permissions; higher latency; deferred.
- Roles-only guards — conflicts with FR-011; migrate Users controller off `@Roles` to `@Permissions`.

## R5 — RBAC schema migration from `users.roles` simple-array

**Decision**: New tables `roles`, `permissions`, `user_roles`, `role_permissions`. Remove `users.roles` column in a migration after dual-read is unnecessary (greenfield: drop/replace in same migration series). Seed five roles + full Phase-1 permission matrix. Update `Role` enum constants to `super_admin | admin | designer | operator | viewer` (drop `user`/`guest` from auth model).

**Rationale**: Backlog logical model; required for role–permission mapping and `roles:manage`. Scaffold `user`/`guest` are incompatible with product roles.

**Alternatives considered**:
- Keep simple-array roles — insufficient for permission matrix; rejected.
- Soft-code permissions only in JWT without DB — cannot admin-edit mappings; rejected.

## R6 — Registration / provisioning

**Decision**: No `POST /auth/register`. Admin creates users via `POST /api/v1/users` (`users:create`). If `roleCodes` omitted → assign `viewer`. Bootstrap `super_admin` via seed + env (`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`).

**Rationale**: Clarification Q1/Q2. Seed unlocks first admin without public register.

**Alternatives considered**: Invite tokens in MVP — allowed later; not required if admin provision meets FR-008.

## R7 — Login lockout & throttling

**Decision**: Redis key `auth:lockout:{email}` (or user id) incremented on failed login; after N failures (default 5) set lock TTL (default 15m). Stricter `@Throttle` on login/refresh/password-reset than global limit.

**Rationale**: FR-016/017; Redis already in stack. Email-keyed lockout covers unknown-user enumeration timing if combined with constant-time-ish responses.

**Alternatives considered**: DB-only failed attempt columns — works; Redis preferred for TTL expiry simplicity.

## R8 — Password reset (MVP)

**Decision**: Stub mailer: `POST /auth/forgot-password` always returns generic success; store hashed reset token + expiry on user or `password_reset_tokens` table; `POST /auth/reset-password` consumes token. Log/dev-print token only in non-production if needed for QA.

**Rationale**: Spec allows stub until mailer; keeps secure confirm path.

## R9 — Cookie parsing in Nest

**Decision**: Add `cookie-parser` middleware in `main.ts`; read refresh cookie name from config (e.g. `refresh_token`). CORS `credentials: true` already required for cookie refresh from web origin.

**Rationale**: Standard Express/Nest approach for HTTP-only cookies.

## R10 — Module boundaries

**Decision**: `AuthModule` imports `UsersModule` (and RBAC repositories as needed). Export nothing Workflow-specific. Register `PermissionsGuard` as global `APP_GUARD` after JWT (order: Throttler → JwtAuth → Permissions). `RolesGuard` may remain for rare role checks but new endpoints use permissions.

**Rationale**: FR-020; matches existing global guard pattern in `app.module.ts`.
