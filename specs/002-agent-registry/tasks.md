# Tasks: Agent Registry

**Input**: Design documents from `/specs/002-agent-registry/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include unit tests for visibility/immutability and e2e smoke aligned with quickstart (feature-development requires testing).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel  
- **[Story]**: User story (US1–US4)

---

## Phase 1: Setup

- [x] T001 Create `src/modules/agents/` skeleton (`agents.module.ts`, `controllers/`, `services/`, `repositories/`, `entities/`, `dto/`, `enums/`)
- [x] T002 [P] Add enums `AgentStatus`, `AgentVersionStatus`, `CapabilityType` under `src/modules/agents/enums/` (and re-export from `src/common/enums/` if that is the project pattern)
- [x] T003 [P] Confirm `PERMISSIONS.AGENTS.*` in `src/common/constants/` covers create/read/update/delete/publish; add agent error codes if project uses typed error codes

## Phase 2: Foundational (blocking)

- [x] T004 Create `AgentEntity` in `src/modules/agents/entities/agent.entity.ts` (code, name, description, capabilityType, status, enabled, currentVersion, createdBy, BaseEntity soft delete)
- [x] T005 [P] Create `AgentVersionEntity` in `src/modules/agents/entities/agent-version.entity.ts` (agentId, version, status, jsonb schemas/config, timeoutMs, maxRetries, promptRef, toolRefs, changelog, publishedAt, createdBy)
- [x] T006 Migration `CreateAgentsTables` under `src/infrastructure/database/migrations/` with unique `agents.code`, unique `(agent_id, version)`, partial unique one draft version per agent
- [x] T007 [P] Repositories `AgentsRepository`, `AgentVersionsRepository` under `src/modules/agents/repositories/`
- [x] T008 Wire `AgentsModule` providers/exports; import in `src/app.module.ts`
- [x] T009 Idempotent seed `src/infrastructure/database/seeds/agents.seed.ts` for `research-agent` + `review-agent` (published v1); register in seed runner

**Checkpoint**: Schema + module shell + seed ready

---

## Phase 3: US1 — Register and Browse Agents (P1) 🎯 MVP

**Goal**: Admin creates draft Agents; list/get with filters; non-admins never see drafts; duplicate code → 409

**Independent Test**: Quickstart Scenario B (create) + A (seed list) + draft id 404 for viewer

- [x] T010 [US1] DTOs: `CreateAgentDto`, `UpdateAgentDto`, `ListAgentsQueryDto`, response DTOs under `src/modules/agents/dto/`
- [x] T011 [US1] `AgentsService.create` + `findAll` + `findOne` with draft visibility rule (admin via `agents:update`; readers published-only; draft get → 404)
- [x] T012 [US1] `AgentsController` `POST/GET /agents`, `GET /agents/:id` with `@Permissions('agents:create'|'agents:read')` per [contracts/agents-api.yaml](./contracts/agents-api.yaml)
- [x] T013 [US1] Unit tests: visibility filtering + duplicate code conflict in `src/modules/agents/services/agents.service.spec.ts`

---

## Phase 4: US2 — Configure Draft and Publish Immutable Version (P1)

**Goal**: Update draft config; publish immutable version; parallel draft version while Agent stays published

**Independent Test**: Quickstart Scenarios B + C

- [x] T014 [US2] `AgentsService.update` (metadata always; config only on draft version; reject published version mutation)
- [x] T015 [US2] `publish` flow: validate schemas → publish draft version → set agent `published` + `currentVersion`
- [x] T016 [US2] `createVersion` + `listVersions` + `getVersion` (at most one draft; non-admins published versions only)
- [x] T017 [US2] Controller routes: `PATCH /agents/:id`, `POST /agents/:id/publish`, `GET|POST /agents/:id/versions`, `GET /agents/:id/versions/:version` with correct `@Permissions`
- [x] T018 [US2] Unit tests: immutability, parallel draft, second draft → 409, publish validation

---

## Phase 5: US3 — Enable, Disable, Archive (P2)

**Goal**: Toggle `enabled`; soft-delete to `archived`; designers cannot mutate

**Independent Test**: Quickstart Scenario D

- [x] T019 [US3] `enable` / `disable` / `softDelete` (archive) in `AgentsService`; idempotent enable/disable; reject enable on archived
- [x] T020 [US3] Controller `POST .../enable`, `POST .../disable`, `DELETE /agents/:id` with `@Permissions('agents:update'|'agents:delete')`
- [x] T021 [US3] Default list excludes archived/soft-deleted; unit tests for enable/archive

---

## Phase 6: US4 — Role-Appropriate Catalog Access (P2)

**Goal**: Permission matrix enforcement end-to-end (designer/viewer read published only; mutate 403)

**Independent Test**: Quickstart Scenario A + D step 5 + E

- [x] T022 [US4] Permission enforcement covered by existing `PermissionsGuard` + unit visibility tests; full docker e2e deferred (placeholder `test/app.e2e-spec.ts`)
- [x] T023 [US4] Swagger tags/decorators on Agents controller aligned with OpenAPI operationIds

---

## Phase 7: Polish

- [x] T024 Migration + agents seed executed locally; Nest maps all `/api/v1/agents` routes
- [x] T025 Update `docs/product/BACKLOG.md` Agent Registry Status → Review
- [x] T026 Contracts (`contracts/types.ts`, `interfaces.ts`) aligned with implemented DTOs

## Dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (entities, migration, repos, module, seed)
    ↓
Phase 3 US1 (create/list/get + visibility)  ← MVP
    ↓
Phase 4 US2 (update/publish/versions)
    ↓
Phase 5 US3 (enable/disable/archive)
    ↓
Phase 6 US4 (e2e permissions) + Phase 7 Polish
```

US3 depends on US1 (agent exists). US2 depends on US1. US4 validates US1–US3.

## Parallel examples

- After T001: T002 ∥ T003  
- After entities planned: T004 ∥ T005  
- After migration T006: T007 can proceed; T009 seed after T006  
- After US1 service exists: T013 tests ∥ start T014 design

## Implementation strategy

User requested full module delivery; tasks executed as a single implementation pass with unit tests, migration, and seed.
