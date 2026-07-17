# Tasks: Design Brief Workflow

**Input**: Design documents from `/specs/011-design-brief/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Stub fixtures (User Story 1 foundation)

- [x] T001 Extend `StubAgentRunnerService` with Design Brief agent fixtures (`fashion-design-brief-writer`, `fashion-design-spec-writer`) + unit tests in `src/modules/executions/services/stub-agent-runner.service.ts` and `stub-agent-runner.service.spec.ts`

## Phase 2: Seed catalog (User Story 2)

- [x] T002 [P] [US2] Seed two Design Brief Agents in `src/infrastructure/database/seeds/agents.seed.ts` (idempotent; `toolRefs: []`)
- [x] T003 [P] [US2] Seed two Design Brief Prompts + wire `promptRef` in `src/infrastructure/database/seeds/prompts.seed.ts`
- [x] T004 [US2] Seed published Workflow `kids-fashion-design-brief` (linear brief → spec; spec maps `designBrief`; `policies.requiredInputs`) in `src/infrastructure/database/seeds/workflows.seed.ts`

## Phase 3: Docs & backlog (User Stories 1/3/4)

- [x] T005 [US1] Ensure `specs/011-design-brief/contracts/` + `quickstart.md` align with seed codes and handoff shapes
- [x] T006 [US1] Run targeted Jest (`stub-agent-runner`, `required-inputs`, `executions.service`) and mark BACKLOG Design Brief **Done** if green

## Dependencies

- T001 can start immediately (independent of seeds).
- T002 and T003 can run in parallel after T001 (or in parallel with T001 if preferred).
- T004 depends on T002 + T003 (Agents/Prompts must exist for assignable graph).
- T005–T006 after T004.

## Parallel example

```text
T001 ‖ T002 ‖ T003  →  T004  →  T005 ‖ T006
```

## Implementation notes

- No `tools.seed.ts` changes (empty `toolRefs`).
- No new NestJS module / migration.
- User Story 4 (cancel/retry) inherits Execution — validated by existing execution tests, not new Fashion-specific tasks.
