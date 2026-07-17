# Tasks: Workflow Management

**Input**: Design documents from `/specs/003-workflow-management/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1–2: Setup + Foundational

- [x] T001 Create `src/modules/workflows/` skeleton
- [x] T002 Enums `WorkflowStatus`, `WorkflowVersionStatus`
- [x] T003 Error codes `WORKFLOW_*`
- [x] T004–T005 Entities `WorkflowEntity`, `WorkflowVersionEntity`
- [x] T006 Migration `CreateWorkflowsTables`
- [x] T007 Repositories
- [x] T008 Wire `WorkflowsModule` in `AppModule`
- [x] T009 Seed `sample-empty-workflow` + `seed:workflows`

## Phase 3–5: US1–US5

- [x] T010 DTOs
- [x] T011 Service create/list/findById + visibility
- [x] T012 Controller list/create/get
- [x] T013 Unit tests visibility + duplicate
- [x] T014–T017 Update/publish/versions + clone + archive
- [x] T018 Unit tests immutability/clone/archive
- [x] T019 Controller routes complete
- [x] T020 Contracts + quickstart + backlog Review

## Dependencies

```text
Setup → Foundational → US1 create/browse → US2 publish/versions → US3 clone → US4 archive → US5 RBAC (guards)
```
