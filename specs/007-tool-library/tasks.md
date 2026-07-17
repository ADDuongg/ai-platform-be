# Tasks: Tool Library

**Input**: Design documents from `/specs/007-tool-library/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Unit tests for visibility/immutability/secret rejection/assignment validation.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Create `src/modules/tools/` skeleton
- [x] T002 [P] Add enums `ToolStatus`, `ToolVersionStatus`, `ToolType`
- [x] T003 [P] Add `TOOL_*` error codes; confirm `PERMISSIONS.TOOLS.*`

## Phase 2: Foundational

- [x] T004 Create `ToolEntity`
- [x] T005 [P] Create `ToolVersionEntity`
- [x] T006 Migration `CreateToolsTables` (1710000007000)
- [x] T007 [P] Repositories
- [x] T008 Wire `ToolsModule` + `AppModule`
- [x] T009 Seed tools + wire Research/Review `toolRefs`

## Phase 3–7: US1–US5

- [x] T010–T026 Service, controller, DTOs, Agent `toolRefs` validation, enable/disable/archive, tests

## Phase 8: Polish

- [x] T027 Migration + seed runnable; routes mapped
- [x] T028 BACKLOG → Review
- [x] T029 Quickstart aligned

## Dependencies

Setup → Foundational → US1 → US2 → US3 → US4/US5 → Polish
