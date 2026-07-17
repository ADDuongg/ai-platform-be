# Quickstart Validation: Prompt Library

**Feature**: `006-prompt-library` | **Date**: 2026-07-15

Validate end-to-end after implementation. Contracts: [contracts/prompts-api.yaml](./contracts/prompts-api.yaml). Data model: [data-model.md](./data-model.md).

## Prerequisites

- Auth + RBAC working (login, permissions seed including `prompts:*` and `agents:*`)
- Agent Registry working (sample Agents seeded)
- Docker Compose services up (Postgres, Redis)
- Migrations + seeds applied (including Prompt sample seed + Agent `promptRef` wiring)
- API listening (default `http://localhost:3000`)

## Setup

```bash
pnpm install
docker compose up -d
pnpm migration:run
pnpm seed
pnpm start:dev
```

## Scenario A — Seeded catalog + Agent wiring (non-admin read)

1. Login as bootstrap admin; create a `viewer` (or `designer`) user if needed
2. Login as that reader
3. `GET /api/v1/prompts` → expect ≥1 Prompt including `research-brief`, all `status=published`
4. Confirm no `draft` Prompts in the list; published with `enabled=false` would still appear if present
5. `GET /api/v1/agents` (or get seeded Research Agent by id) → version detail `promptRef` shows `research-brief`
6. Call prompts without Authorization → expect `401`

## Scenario B — Admin create → empty OK → publish content gate

1. Login as admin/super_admin
2. `POST /api/v1/prompts` with unique `code`, `name`, empty content → expect `201`, `status=draft`
3. `GET /api/v1/prompts?status=draft` as admin → includes the new Prompt
4. As designer/viewer, `GET` that draft id → expect `404` (or `403`)
5. `POST /api/v1/prompts/{id}/publish` with still-empty content → expect `400`/`422`
6. `PATCH /api/v1/prompts/{id}` with non-empty `template` and/or `messages`
7. `POST /api/v1/prompts/{id}/publish` → `status=published`, `currentVersion=1`
8. As designer, list Prompts → new Prompt visible; `GET /api/v1/prompts/by-code/{code}` succeeds

## Scenario C — Parallel draft version

1. As admin, on a published Prompt: `POST /api/v1/prompts/{id}/versions`
2. Expect Prompt still `published`; response version `status=draft`
3. As designer, `GET /api/v1/prompts/{id}/versions` → only published versions
4. As admin, update draft content via `PATCH /api/v1/prompts/{id}`, then publish
5. Expect `currentVersion` incremented; prior published version unchanged when fetched by version number
6. Second `POST .../versions` while draft exists → `409`

## Scenario D — Enable / disable / archive + code reuse

1. As admin, `POST /api/v1/prompts/{id}/disable` → `enabled=false`, status still `published`
2. As designer, Prompt still listed with `enabled=false`
3. As admin, set Agent draft `promptRef` to that code → expect `422` (assignment blocked)
4. `POST .../enable` → `enabled=true`; assignment of that code succeeds
5. `DELETE /api/v1/prompts/{id}` → archived; absent from default lists
6. `POST /api/v1/prompts` with the **same** `code` → expect `201` (reuse allowed)
7. As designer, mutate prompt endpoints → `403`

## Scenario E — Agent promptRef validation

1. As admin, create/publish an enabled Prompt with code `assignable-prompt`
2. Update Agent draft: `promptRef=assignable-prompt` → success
3. Try `promptRef` of draft-only / disabled / archived / unknown code → `422` each
4. Clear `promptRef` to `null` → success
5. As designer (no Agent update in default matrix), mutate Agent → `403`

## Scenario F — Duplicate active code

1. With active `research-brief` present, `POST /api/v1/prompts` with code `research-brief` → `409`

## Done when

- Scenarios A–F pass
- Unit/e2e tests for visibility, publish content gate, immutability, code reuse, and Agent assignment green
- Contracts unchanged unless intentionally versioned
