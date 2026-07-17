# Tasks: Trend Research Workflow

**Input**: Design documents from `/specs/008-trend-research/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Foundational (required-input + stub fixtures)

- [x] T001 Add `extractRequiredInputs` / `assertRequiredInputs` in `src/modules/executions/services/required-inputs.ts` and unit tests
- [x] T002 Call `assertRequiredInputs` from `ExecutionsService.start` after definition validate; extend `executions.service.spec.ts`
- [x] T003 Extend `StubAgentRunnerService` with Fashion agent fixtures + unit tests
- [x] T004 Document `policies.requiredInputs` in `workflow-definition.types.ts` (JSDoc)

## Phase 2: Seed catalog (User Story 2)

- [x] T005 Seed three Fashion Agents in `agents.seed.ts` (idempotent)
- [x] T006 Seed three Fashion Prompts + wire `promptRef` in `prompts.seed.ts`
- [x] T007 Wire `web-search` toolRefs for research + collector in `tools.seed.ts`
- [x] T008 Seed published Workflow `kids-fashion-trend-research` in `workflows.seed.ts`

## Phase 3: Docs & backlog (User Stories 1/3)

- [x] T009 Verify quickstart.md aligns with seed codes; mark BACKLOG Status Implementing → Review when done
- [x] T010 Run targeted Jest (`required-inputs`, `stub-agent-runner`, `executions.service`) and fix failures

## Dependencies

T001 → T002; T003 independent; T005 → T006 → T007 → T008; T009–T010 after seeds.
