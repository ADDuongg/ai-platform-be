# Quickstart Validation: Agent Registry

**Feature**: `002-agent-registry` | **Date**: 2026-07-14

Validate end-to-end after implementation. Contracts: [contracts/agents-api.yaml](./contracts/agents-api.yaml). Data model: [data-model.md](./data-model.md).

## Prerequisites

- Auth + RBAC working (login, permissions seed including `agents:*`)
- Docker Compose services up (Postgres, Redis)
- Migrations + seeds applied (including Agent sample seed)
- API listening (default `http://localhost:3000`)

## Setup

```bash
pnpm install
docker compose up -d
pnpm migration:run
pnpm seed
pnpm start:dev
```

## Scenario A — Seeded catalog (non-admin read)

1. Login as bootstrap admin; create a `viewer` (or `designer`) user if needed
2. Login as that reader
3. `GET /api/v1/agents` → expect ≥2 Agents including `research-agent` and `review-agent`, all `status=published`
4. Confirm no `draft` Agents in the list
5. Call without Authorization → expect `401`

## Scenario B — Admin create → publish

1. Login as admin/super_admin
2. `POST /api/v1/agents` with unique `code`, schemas → expect `201`, `status=draft`
3. `GET /api/v1/agents?status=draft` as admin → includes the new Agent
4. As designer/viewer, `GET` that draft id → expect `404` (or `403`)
5. `POST /api/v1/agents/{id}/publish` → `status=published`, `currentVersion=1`
6. As designer, list Agents → new Agent visible

## Scenario C — Parallel draft version

1. As admin, on a published Agent: `POST /api/v1/agents/{id}/versions`
2. Expect Agent still `published`; response version `status=draft`
3. As designer, `GET /api/v1/agents/{id}/versions` → only published versions
4. As admin, update draft config via `PATCH /api/v1/agents/{id}`, then publish
5. Expect `currentVersion` incremented; prior published version unchanged when fetched by version number
6. Second `POST .../versions` while draft exists → `409`

## Scenario D — Enable / disable / archive

1. As admin, `POST /api/v1/agents/{id}/disable` → `enabled=false`, status still `published`
2. As designer, Agent still listed but treated as not assignable (`enabled=false`)
3. `POST .../enable` → `enabled=true`
4. `DELETE /api/v1/agents/{id}` → archived; absent from default lists
5. As designer, mutate endpoints → `403`

## Scenario E — Duplicate code

1. `POST /api/v1/agents` with code `research-agent` → `409`

## Done when

- Scenarios A–E pass
- Unit/e2e tests for visibility + immutability green
- Contracts unchanged unless intentionally versioned
