# Tasks: Execution Deliverables / Artifacts

**Input**: Design documents from `/specs/021-execution-artifacts/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

> Primary BE deliverable. FE Modules consume list/download via contract pack.  
> **MVP**: US1 (inline) + US2 (blob image_set) + US3 (list/download API) + US4 (best-effort failures) + Kids Fashion seed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1…US4 from spec.md

## Phase 1: Setup / contracts

**Purpose**: Spec, design, FE contracts, backlog link

- [x] T001 Spec + checklist (`specs/021-execution-artifacts/spec.md`, `checklists/requirements.md`)
- [x] T002 Plan / research / data-model / quickstart
- [x] T003 OpenAPI `contracts/execution-artifacts-api.yaml`
- [x] T004 [P] Typed FE contracts `contracts/types.ts` + `interfaces.ts` + `index.ts`
- [x] T005 Link Spec on `docs/product/BACKLOG.md`; Status Implementing

**Checkpoint**: Contracts ready for FE

---

## Phase 2: Foundational (blocking)

**Purpose**: Schema, entity, repo, blob store, config — required before stories

- [x] T006 Migration `src/infrastructure/database/migrations/1710000009000-CreateExecutionArtifactsTable.ts` per `data-model.md`
- [x] T007 [P] Entity `src/modules/executions/entities/execution-artifact.entity.ts` (+ enums/constants as needed)
- [x] T008 [P] Repository `src/modules/executions/repositories/execution-artifacts.repository.ts`
- [x] T009 [P] `ArtifactBlobStore` interface + `LocalArtifactBlobStore` in `src/modules/executions/services/artifact-blob-store.ts` with S3 TODO comment; env `ARTIFACT_STORAGE_ROOT` in config/validation
- [x] T010 Wire TypeORM entity + providers in `src/modules/executions/executions.module.ts`
- [x] T011 Add error codes `ARTIFACT_NOT_FOUND` / `ARTIFACT_NOT_READY` in `src/common/constants/error-codes.ts` if missing

**Checkpoint**: DB + DI ready; no HTTP yet

---

## Phase 3: User Story 1 — Inline text/json deliverables (P1) 🎯 MVP

**Goal**: On COMPLETED, materialize `persist: inline` outputs into Artifact rows.

**Independent Test**: Mock completed execution with `policies.outputs` text + context key → Artifact `status=ready` with matching `content_json`.

- [x] T012 [US1] Implement `ArtifactMaterializerService` inline path in `src/modules/executions/services/artifact-materializer.service.ts`
- [x] T013 [US1] Hook materializer after COMPLETED in `execution-orchestrator.service.ts` (best-effort try/catch; idempotent if rows exist)
- [x] T014 [US1] Unit tests `artifact-materializer.service.spec.ts` — inline ready + missing key → failed; execution status untouched

---

## Phase 4: User Story 2 — Blob image / image_set (P1) 🎯 MVP

**Goal**: Download vendor URLs into local blob store; Kids Fashion seed declares outputs.

**Independent Test**: Mock context `rawGenerations[{assetUrl}]` + http mock → files under storage root + Artifact ready with manifest.

- [x] T015 [US2] Extend materializer for `image` / `image_set` / `file` blob download + put via `ArtifactBlobStore`
- [x] T016 [US2] Seed `policies.outputs` for `rawGenerations` on kids-fashion in `src/infrastructure/database/seeds/workflows.seed.ts`
- [x] T017 [US2] Unit tests: image_set happy path (mocked fetch) + download failure → failed Artifact / partial items

---

## Phase 5: User Story 3 — List + content API (P1) 🎯 MVP

**Goal**: FE can list and download Artifacts with `executions:read`.

**Independent Test**: Authenticated GET list returns rows; missing permission 403; content endpoint streams blob or JSON.

- [x] T018 [US3] DTO + controller endpoints per `contracts/execution-artifacts-api.yaml` (`list` + `content`)
- [x] T019 [US3] Service methods list/getContent; 404 execution/artifact; 409 `ARTIFACT_NOT_READY`
- [x] T020 [US3] Register routes; permission `PERMISSIONS.EXECUTIONS.READ`

---

## Phase 6: User Story 4 — Observable materialization failures (P2)

**Goal**: Failures visible on Artifact (`status`/`errorMessage`); never flip COMPLETED → FAILED.

**Independent Test**: Force materializer error; execution remains completed; Artifact failed fields set.

- [x] T021 [US4] Ensure orchestrator never propagates materializer throw to terminal status change
- [x] T022 [US4] Tests assert COMPLETED preserved + failed Artifact fields populated

---

## Phase 7: Polish

- [ ] T023 [P] [FE] Align client with `ExecutionArtifactsApiClient` in `ai-platform-fe` (can ship after BE)
- [x] T024 Run jest for materializer (+ related executions specs if touched)
- [x] T025 Quickstart smoke note / BACKLOG → Done when MVP acceptance + tests pass

## Dependency

```text
T001–T005 → T006–T011 (foundational)
T006–T011 → T012–T014 (US1)
US1 → T015–T017 (US2)
US1 → T018–T020 (US3)
US1+US2 → T021–T022 (US4 polish)
MVP Done = US1+US2+US3 + seed + T024/T025
T023 FE parallel
```

## Parallel opportunities

- T007 ∥ T008 ∥ T009 after T006
- T015–T017 ∥ T018–T020 after US1
- T023 anytime after contracts

## Implementation strategy

1. Foundational schema + blob store.
2. Inline materializer + orchestrator hook (US1).
3. Blob image_set + Kids Fashion seed (US2).
4. List/download API (US3).
5. Failure observability tests (US4).
6. Mark BACKLOG Done after tests green.
