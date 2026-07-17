# Quickstart Validation: Auth + RBAC

**Feature**: `001-auth-rbac` | **Date**: 2026-07-14

Validate end-to-end after implementation. Contract details: [contracts/auth-api.yaml](./contracts/auth-api.yaml). Data model: [data-model.md](./data-model.md).

## Prerequisites

- Docker Compose services up (Postgres, Redis)
- Env configured: `JWT_SECRET` (≥32 chars), `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
- Migrations + seeds applied
- API listening (default `http://localhost:3000`)

## Setup

```bash
pnpm install
docker compose up -d
pnpm migration:run
pnpm seed   # or documented seed command once added
pnpm start:dev
```

## Scenario A — Bootstrap admin sign-in

1. `POST /api/v1/auth/login` with bootstrap email/password
2. Expect `200`, `accessToken` in JSON body, `Set-Cookie` refresh cookie
3. `GET /api/v1/auth/me` with `Authorization: Bearer <accessToken>`
4. Expect roles include `super_admin` and a non-empty permissions list

## Scenario B — Permission enforcement

1. As admin, `POST /api/v1/users` create a user with no `roleCodes` → expect `viewer`
2. Login as that user
3. `GET /api/v1/users` → expect `403`
4. `GET /api/v1/auth/me` → expect `200`
5. Call without Authorization → expect `401`
6. `GET /health` (or project health path) without auth → expect `200`

## Scenario C — Refresh rotation

1. Login; capture refresh cookie
2. `POST /api/v1/auth/refresh` with cookie → new access token + new cookie
3. Replay old refresh cookie → expect `401` (and family revoke if reuse detection enabled)
4. `POST /api/v1/auth/logout` → refresh cleared; subsequent refresh fails

## Scenario D — Lockout / throttle smoke

1. Fail login N times (default 5) with wrong password
2. Correct password during lockout window → still rejected
3. After TTL, login succeeds

## Scenario E — No public register

1. `POST /api/v1/auth/register` (if path absent → 404) must not create users
2. Only `POST /api/v1/users` with `users:create` provisions accounts

## Automated checks (once tests exist)

```bash
pnpm test
pnpm test:e2e
```

Expected: auth unit/e2e suites covering login, refresh reuse, permission deny, default viewer, soft-delete sign-in deny.
