# Tasks: Builder Node I/O Mapping

**Input**: Design documents from `/specs/019-node-io-mapping/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

> Primary BE deliverable = FE contract pack. Nest Execution/Builder runtime already supports mappings. FE UI lives in `ai-platform-fe`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1…US4 from spec.md

## Phase 1: Setup / contracts (this repo)

**Purpose**: FE-consumable API contracts + backlog link

- [x] T001 Spec + clarifications (`spec.md`, `checklists/requirements.md`)
- [x] T002 Plan / research / data-model / quickstart
- [x] T003 OpenAPI `contracts/node-io-mapping-api.yaml` (definition get/put, PATCH node, publish)
- [x] T004 [P] Typed FE contracts `contracts/types.ts` + `interfaces.ts` + `index.ts` (incl. `MappingPair` helpers)
- [x] T005 Link Spec on BACKLOG; Status Implementing; note Phase B spun from 018

**Checkpoint**: Contracts ready for FE

---

## Phase 2: Foundational (FE repo)

**Purpose**: Wire client against 019 contracts before UI stories

- [x] T006 [P] [FE] Add/align API client methods with `NodeIoMappingApiClient` (`ai-platform-fe`)
- [x] T007 [P] [FE] Import or copy mapping helpers (`mappingPairsToRecord` / `recordToMappingPairs`) from contracts

**Checkpoint**: FE can GET definition + PATCH node mappings

---

## Phase 3: User Story 1 — Edit input mapping (P1) 🎯 MVP

**Goal**: Designer edits `inputMapping` on selected draft node and persists.

**Independent Test**: Change one pair → save → reload definition → pair present on `node.id`.

- [x] T008 [US1] [FE] Node panel: Input mapping section with left=agent key, right=context path labels
- [x] T009 [US1] [FE] Add/edit/remove input pairs; drop incomplete rows; de-dupe left keys
- [x] T010 [US1] [FE] Save via `updateWorkflowNode` (or replace definition) with `inputMapping` only when dirty
- [x] T011 [US1] [FE] Gate edit/save on `workflows:update`; read-only when lacking permission

---

## Phase 4: User Story 2 — Edit output mapping (P1)

**Goal**: Designer edits `outputMapping` with correct context ← output path labels.

**Independent Test**: Change one output pair → save → reload → match.

- [x] T012 [US2] [FE] Node panel: Output mapping section (left=context key, right=agent output path)
- [x] T013 [US2] [FE] Add/edit/remove output pairs + save `outputMapping` (same persist path as US1)
- [x] T014 [US2] [FE] Publish flow check: after publish, published definition shows updated maps

---

## Phase 5: User Story 3 — Clear / empty maps (P2)

**Goal**: Clear all pairs; persist `{}`; runtime meaning unchanged.

- [x] T015 [US3] [FE] “Clear all” / delete last row sends `inputMapping: {}` or `outputMapping: {}` (not omit)
- [x] T016 [US3] [FE] Confirm omit-vs-clear: switching nodes without edits does not PATCH empty maps accidentally

---

## Phase 6: User Story 4 — Semantics UX (P2)

**Goal**: Labels cannot be misread as reversed.

- [x] T017 [US4] [FE] Copy/labels match `docs/engineering/CONTEXT_MAPPING_3NODE_PIPELINE.md` (input agent←context; output context←output)
- [x] T018 [US4] [FE] Peer checklist: no ambiguous “source/target” wording that swaps direction

---

## Phase 7: Polish

- [x] T019 [P] Optional BE: fix misleading `$.input.*` examples in `specs/018-workflow-start-inputs/contracts/workflow-start-inputs-api.yaml` (align with engine paths)
- [x] T020 Validate quickstart scenarios (PATCH + clear + publish) against running API / Builder smoke
- [x] T021 Update BACKLOG 019 → Done; note FE smoke + BE unit tests

## Dependency

```text
T001–T005 (BE contracts) → T006–T007 (FE client)
T006–T007 → T008–T011 (US1 MVP)
US1 → US2 (T012–T014)
US1/US2 → US3 (clear) → US4 (copy polish)
T019 optional anytime after T003
T020–T021 after FE MVP
```

## Implementation strategy

1. BE contracts Done (this repo).
2. FE MVP = US1 + US2 (edit both maps + save + publish check).
3. US3/US4 polish before marking Done.
4. Do not change Execution mapper behavior.

**Status 2026-07-21:** **Done.** BE contracts + T019; FE Builder mapping UI smoke; unit tests `workflow-engine` + `workflow-builder` passed (18).
