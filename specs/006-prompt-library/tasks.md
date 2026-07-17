# Tasks: Prompt Library

**Input**: Design documents from `/specs/006-prompt-library/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include unit tests for visibility/immutability/publish content gate/assignment validation and quickstart-aligned smoke (feature-development requires testing).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel  
- **[Story]**: User story (US1–US5)

---

## Phase 1: Setup

- [x] T001 Create `src/modules/prompts/` skeleton (`prompts.module.ts`, `controllers/`, `services/`, `repositories/`, `entities/`, `dto/`, `enums/`)
- [x] T002 [P] Add enums `PromptStatus`, `PromptVersionStatus` under `src/modules/prompts/enums/` (re-export from `src/common/enums/` if that is the project pattern)
- [x] T003 [P] Confirm `PERMISSIONS.PROMPTS.*` in `src/common/constants/` covers create/read/update/delete/publish; add prompt error codes if project uses typed error codes

## Phase 2: Foundational (blocking)

- [x] T004 Create `PromptEntity` in `src/modules/prompts/entities/prompt.entity.ts` (code, name, description, category, tags jsonb, status, enabled, currentVersion, createdBy, BaseEntity soft delete)
- [x] T005 [P] Create `PromptVersionEntity` in `src/modules/prompts/entities/prompt-version.entity.ts` (promptId, version, status, template, messages jsonb, variablesSchema jsonb, modelHints jsonb, changelog, publishedAt, createdBy)
- [x] T006 Migration `CreatePromptsTables` under `src/infrastructure/database/migrations/` — partial unique `prompts.code` WHERE `deleted_at IS NULL`, unique `(prompt_id, version)`, partial unique one draft version per prompt
- [x] T007 [P] Repositories `PromptsRepository`, `PromptVersionsRepository` under `src/modules/prompts/repositories/`
- [x] T008 Wire `PromptsModule` providers/exports (+ export read helper for Agents); import in `src/app.module.ts`
- [x] T009 Idempotent seed `src/infrastructure/database/seeds/prompts.seed.ts` for published `research-brief` (+ wire ≥1 sample Agent `promptRef` in agents seed); register in seed runner

**Checkpoint**: Schema + module shell + seed ready

---

## Phase 3: US1 — Register and Browse Prompts (P1) 🎯 MVP

**Goal**: Admin creates draft Prompts (empty content OK); list/get/by-code with filters; non-admins never see drafts; duplicate active code → 409; archive then reuse code allowed

**Independent Test**: Quickstart Scenario A (seed list) + B (create) + draft id 404 for viewer + Scenario E (code reuse)

- [x] T010 [US1] DTOs: `CreatePromptDto`, `UpdatePromptDto`, `ListPromptsQueryDto`, response DTOs under `src/modules/prompts/dto/`
- [x] T011 [US1] `PromptsService.create` + `findAll` + `findOne` + `findByCode` with draft visibility (admin via `prompts:update`; readers published-only including `enabled=false`; draft get → 404)
- [x] T012 [US1] `PromptsController` `POST/GET /prompts`, `GET /prompts/:id`, `GET /prompts/by-code/:code` with `@Permissions` per [contracts/prompts-api.yaml](./contracts/prompts-api.yaml)
- [x] T013 [US1] Unit tests: visibility filtering, duplicate active code conflict, by-code resolve ignores archived in `src/modules/prompts/services/prompts.service.spec.ts`

---

## Phase 4: US2 — Configure Draft and Publish Immutable Version (P1)

**Goal**: Update draft content; publish requires usable content; parallel draft version while Prompt stays published; published content immutable

**Independent Test**: Quickstart Scenarios B + C

- [x] T014 [US2] `PromptsService.update` (metadata always; content only on draft version; reject published version mutation)
- [x] T015 [US2] `publish` flow: validate usable content (non-empty template and/or messages) → publish draft version → set prompt `published` + `currentVersion`; reject empty content
- [x] T016 [US2] `createVersion` + `listVersions` + `getVersion` (at most one draft; non-admins published versions only)
- [x] T017 [US2] Controller routes: `PATCH /prompts/:id`, `POST /prompts/:id/publish`, `GET|POST /prompts/:id/versions`, `GET /prompts/:id/versions/:version` with correct `@Permissions`
- [x] T018 [US2] Unit tests: immutability, empty-publish reject, parallel draft, second draft → 409

---

## Phase 5: US3 — Assign Prompt to Agent (P1)

**Goal**: Validate Agent `promptRef` against active published+enabled Prompt by code; clear null OK; reject draft/disabled/archived/unknown

**Independent Test**: Quickstart Scenario F

- [x] T019 [US3] Export `PromptsService.assertAssignableByCode(code)` (or equivalent read API) from `PromptsModule`
- [x] T020 [US3] Hook `AgentsService` create/update paths: when `promptRef` non-empty, call Prompts assert; when null/empty, allow clear; import `PromptsModule` in `AgentsModule`
- [x] T021 [US3] Unit tests: assignable success; reject draft/disabled/archived/unknown; clear null; resolve active after code reuse

---

## Phase 6: US4 — Enable, Disable, Archive (P2)

**Goal**: Toggle `enabled`; soft-delete to `archived`; designers cannot mutate; disabled still listed for non-admins when published

**Independent Test**: Quickstart Scenario D

- [x] T022 [US4] `enable` / `disable` / `softDelete` (archive) in `PromptsService`; idempotent enable/disable; reject enable on archived
- [x] T023 [US4] Controller `POST .../enable`, `POST .../disable`, `DELETE /prompts/:id` with `@Permissions('prompts:update'|'prompts:delete')`
- [x] T024 [US4] Default list excludes archived/soft-deleted; unit tests for enable/archive + disabled visible to non-admin

---

## Phase 7: US5 — Role-Appropriate Catalog Access (P2)

**Goal**: Permission matrix enforcement (designer/viewer read published only; mutate 403)

**Independent Test**: Quickstart Scenario A + D mutate 403

- [x] T025 [US5] Permission enforcement via `PermissionsGuard` + unit visibility tests; Swagger tags/decorators aligned with OpenAPI operationIds
- [x] T026 [US5] Contracts (`contracts/types.ts`, `interfaces.ts`) aligned with implemented DTOs

---

## Phase 8: Polish

- [x] T027 Migration + prompts seed (+ agents `promptRef` wire) executed locally; Nest maps all `/api/v1/prompts` routes
- [x] T028 Update `docs/product/BACKLOG.md` Prompt Library Status → Review (after tests pass)
- [x] T029 Quickstart smoke validation notes / fix gaps vs [quickstart.md](./quickstart.md)

## Dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (entities, migration, repos, module, seed)
    ↓
Phase 3 US1 (create/list/get/by-code + visibility)  ← MVP
    ↓
Phase 4 US2 (update/publish/versions)
    ↓
Phase 5 US3 (Agent promptRef validation)  ← needs US1+US2 assignable prompts
    ↓
Phase 6 US4 (enable/disable/archive)
    ↓
Phase 7 US5 (permissions/swagger polish)
    ↓
Phase 8 Polish
```

## Parallel opportunities

- T002 ∥ T003 after T001
- T005 ∥ T007 after T004
- T014–T016 service methods can be sequenced; T017 controller after service
- T019 before T020 (export before Agents hook)

## Implementation strategy

1. Complete Setup + Foundational (module, schema, seed).
2. Ship US1 MVP (register/browse/visibility).
3. Add US2 publish/version immutability.
4. Wire US3 Agent assignment validation.
5. Finish US4/US5 + polish; mark backlog Review.
