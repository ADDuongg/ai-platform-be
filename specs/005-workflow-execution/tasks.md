# Tasks: Workflow Execution

**Input**: Design documents from `/specs/005-workflow-execution/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1–2: Setup + Foundational

- [x] T001 Add execution error codes in `src/common/constants/error-codes.ts`
- [x] T002 Create enums + entities `execution` / `execution_step` under `src/modules/executions/`
- [x] T003 Migration `1710000005000-CreateExecutionsTables.ts`
- [x] T004 Repositories for executions + steps
- [x] T005 Wire `ExecutionsModule` + BullMQ queue + AppModule import; export validator from WorkflowsModule if needed

## Phase 3: US1 — Start Execution (P1)

- [x] T006 DTOs: execute/create/list/response
- [x] T007 `ExecutionsService.start` (snapshot, pins, empty-graph complete, enqueue)
- [x] T008 Controllers: `POST /workflows/:id/execute`, `POST /executions`
- [x] T009 Unit tests: start published, reject draft, empty graph completes

## Phase 4: US2+US3 — History + Engine (P1)

- [x] T010 `WorkflowEngineService` ready-set + `context-mapper` + stub runner
- [x] T011 `ExecutionOrchestratorService` + `ExecutionProcessor` (BullMQ)
- [x] T012 List/get execution + steps APIs
- [x] T013 Unit tests: dependency order, mapping, list/get

## Phase 5: US4–US5 — Cancel + Retry (P2)

- [x] T014 Cancel pending/running; reject terminal
- [x] T015 Retry failed (no re-run completed); auto step retries
- [x] T016 Unit tests: cancel + retry rules

## Phase 6: US6–US7 + Polish

- [x] T017 Snapshot isolation assertion in tests; seed `sample-research-review`
- [x] T018 Sync contracts/quickstart; BACKLOG Status → Review

## Dependencies

```text
T001–T005 → T006–T009 → T010–T013 → T014–T016 → T017–T018
```
