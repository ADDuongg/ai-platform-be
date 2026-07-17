# Tasks: Image Generation Workflow

**Input**: Design documents from `/specs/012-image-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Stub fixtures (User Story 1 foundation)

- [x] T001 Extend `StubAgentRunnerService` with Image Generation agent fixtures (`fashion-image-prompt-prep`, `fashion-image-generator`, `fashion-image-organizer`; exactly 2 prompts/variations) + unit tests in `src/modules/executions/services/stub-agent-runner.service.ts` and `stub-agent-runner.service.spec.ts`

## Phase 2: Seed catalog (User Story 2)

- [x] T002 [P] [US2] Seed three Image Generation Agents in `src/infrastructure/database/seeds/agents.seed.ts` (idempotent)
- [x] T003 [P] [US2] Seed three Image Generation Prompts + wire `promptRef` in `src/infrastructure/database/seeds/prompts.seed.ts`
- [x] T004 [P] [US2] Wire Tool refs: `fashion-image-generator`→`image-generation`, `fashion-image-organizer`→`object-storage` in `src/infrastructure/database/seeds/tools.seed.ts`
- [x] T005 [US2] Seed published Workflow `kids-fashion-image-generation` (linear prep → generate → organize; mappings + `policies.requiredInputs`) in `src/infrastructure/database/seeds/workflows.seed.ts`

## Phase 3: Docs & backlog (User Stories 1/3/4)

- [x] T006 [US1] Ensure `specs/012-image-generation/contracts/` + `quickstart.md` align with seed codes and handoff shapes
- [x] T007 [US1] Run targeted Jest (`stub-agent-runner`, `required-inputs`, `executions.service`) and mark BACKLOG Image Generation **Done** if green

## Dependencies

- T001 can start immediately (independent of seeds).
- T002, T003, T004 can run in parallel after/with T001.
- T005 depends on T002 + T003 (Agents/Prompts must exist for assignable graph); T004 may complete before or after T005.
- T006–T007 after T005.

## Parallel example

```text
T001 ‖ T002 ‖ T003 ‖ T004  →  T005  →  T006 ‖ T007
```

## Implementation notes

- No new NestJS module / migration.
- User Story 4 (cancel/retry) inherits Execution — validated by existing execution tests, not new Fashion-specific tasks.
