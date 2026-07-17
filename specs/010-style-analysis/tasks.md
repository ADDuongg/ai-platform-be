# Tasks: Style Analysis Workflow

**Input**: Design documents from `/specs/010-style-analysis/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Stub fixtures

- [x] T001 Extend `StubAgentRunnerService` with Style Analysis agent fixtures + unit tests

## Phase 2: Seed catalog (User Story 2)

- [x] T002 Seed four Style Analysis Agents in `agents.seed.ts` (idempotent)
- [x] T003 Seed four Style Analysis Prompts + wire `promptRef` in `prompts.seed.ts`
- [x] T004 Wire `web-browser` toolRefs for color/style/pattern analyzers in `tools.seed.ts`
- [x] T005 Seed published Workflow `kids-fashion-style-analysis` in `workflows.seed.ts`

## Phase 3: Docs & backlog (User Stories 1/3)

- [x] T006 Ensure contracts/ + quickstart.md align with seed codes
- [x] T007 Run targeted Jest (`stub-agent-runner`, `required-inputs`, `executions.service`) and mark BACKLOG Done if green

## Dependencies

T001 independent; T002 → T003 → T004 → T005; T006–T007 after seeds.
