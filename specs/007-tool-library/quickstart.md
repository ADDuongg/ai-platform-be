# Quickstart Validation: Tool Library

**Feature**: `007-tool-library` | **Date**: 2026-07-15

Validate end-to-end after implementation. Contracts: [contracts/tools-api.yaml](./contracts/tools-api.yaml). Data model: [data-model.md](./data-model.md).

## Prerequisites

- Auth + RBAC working (login, permissions seed including `tools:*` and `agents:*`)
- Agent Registry working (sample Agents seeded)
- Docker Compose services up (Postgres, Redis)
- Migrations + seeds applied (including Tool sample seed + Agent `toolRefs` wiring)
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
3. `GET /api/v1/tools` → expect ≥4 Tools including `web-search`, `web-browser`, `image-generation`, `object-storage`, all `status=published`
4. Confirm no `draft` Tools in the list; published with `enabled=false` would still appear if present
5. `GET /api/v1/agents` → Research Agent `toolRefs` includes `web-search`; Review Agent includes `object-storage`
6. Call tools without Authorization → expect `401`

## Scenario B — Admin create → publish → immutable type

1. Login as admin/super_admin
2. `POST /api/v1/tools` with unique `code`, `name`, `toolType=http`, empty config → expect `201`, `status=draft`
3. `GET /api/v1/tools?status=draft` as admin → includes the new Tool
4. As designer/viewer, `GET` that draft id → expect `404` (or `403`)
5. `POST /api/v1/tools/{id}/publish` → `status=published`, `currentVersion=1`
6. `PATCH` attempting to change type → rejected (type immutable; field absent from UpdateToolRequest)
7. As designer, list Tools → new Tool visible; `GET /api/v1/tools/by-code/{code}` succeeds

## Scenario C — Parallel draft version

1. As admin, on a published Tool: `POST /api/v1/tools/{id}/versions`
2. Expect Tool still `published`; response version `status=draft`
3. As designer, `GET /api/v1/tools/{id}/versions` → only published versions
4. As admin, update draft config via `PATCH /api/v1/tools/{id}`, then publish
5. Expect `currentVersion` incremented; prior published version unchanged when fetched by version number
6. Second `POST .../versions` while draft exists → `409`

## Scenario D — Secret rejection + enable / disable / archive + code reuse

1. As admin, `POST` or `PATCH` with `config: { apiKey: "sk-live" }` → expect `400`/`422` (`TOOL_SECRET_IN_CONFIG` or validation)
2. `POST /api/v1/tools/{id}/disable` → `enabled=false`, status still `published`
3. As designer, Tool still listed with `enabled=false`
4. As admin, set Agent draft `toolRefs` to that code → expect `422` (assignment blocked)
5. `POST .../enable` → `enabled=true`; assignment of that code succeeds
6. `DELETE /api/v1/tools/{id}` → archived; absent from default lists
7. `POST /api/v1/tools` with the **same** `code` → expect `201` (reuse allowed)
8. As designer, mutate tool endpoints → `403`

## Scenario E — Agent toolRefs validation

1. As admin, create/publish an enabled Tool with code `assignable-tool`
2. Update Agent draft: `toolRefs=["assignable-tool"]` → success
3. Try draft-only / disabled / archived / unknown code → `422` each
4. Try duplicate codes in one list → `422`
5. Try 21 codes → `422` (cap 20)
6. Clear `toolRefs` to `[]` → success
7. As designer (no Agent update in default matrix), mutate Agent → `403`

## Scenario F — Duplicate active code

1. With active `web-search` present, `POST /api/v1/tools` with code `web-search` → `409`

## Done when

- Scenarios A–F pass
- Unit/e2e tests for visibility, secret rejection, immutability, code reuse, and Agent assignment green
- Contracts unchanged unless intentionally versioned
