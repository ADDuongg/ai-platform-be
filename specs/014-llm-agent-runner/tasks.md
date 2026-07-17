# Tasks: LLM Agent Runner (Ollama)

**Input**: Design documents from `/specs/014-llm-agent-runner/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included (FR-016 / SC-001 require stub regression + mocked Ollama unit tests)

## Phase 1: Setup

- [x] T001 Confirm branch `014-llm-agent-runner` and feature docs under `specs/014-llm-agent-runner/` match BACKLOG Spec path
- [x] T002 [P] Document env keys in `.env.example` (`AGENT_RUNNER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`)

## Phase 2: Foundational (blocking)

- [x] T003 Extend Joi schema in `src/common/config/env.validation.ts` for `AGENT_RUNNER` (`stub`|`ollama`, default `stub`), `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS` (default 120000); invalid `AGENT_RUNNER` fails bootstrap
- [x] T004 Extract/export `AgentRunner` interface + `AGENT_RUNNER` injection token from `src/modules/executions/services/stub-agent-runner.service.ts` (or `src/modules/executions/constants/agent-runner.constants.ts`)
- [x] T005 Wire Nest factory in `src/modules/executions/executions.module.ts` selecting `StubAgentRunnerService` vs `OllamaAgentRunnerService` from `AGENT_RUNNER`; import `PromptsModule` (or repos) as needed
- [x] T006 Update `ExecutionOrchestratorService` in `src/modules/executions/services/execution-orchestrator.service.ts` to inject `@Inject(AGENT_RUNNER) AgentRunner` instead of concrete `StubAgentRunnerService`
- [x] T007 Add internal Prompt resolve for published+enabled by code (worker-safe, no user permissions) in `src/modules/prompts/` (service/repo) and export for Executions

## Phase 3: User Story 2 — Stub default / CI safety (P1)

**Goal**: Default stub path unchanged; invalid runner mode fails fast.

**Independent Test**: `AGENT_RUNNER=stub` (or unset) — existing stub/execution tests pass without Ollama.

- [x] T008 [US2] Keep stub fixtures intact in `src/modules/executions/services/stub-agent-runner.service.ts` (no deletion of fashion fixtures)
- [x] T009 [P] [US2] Add/adjust unit test proving invalid `AGENT_RUNNER` rejected by env schema in `src/common/config/env.validation.ts` (or dedicated spec)
- [x] T010 [US2] Run existing stub suite `src/modules/executions/services/stub-agent-runner.service.spec.ts` and confirm green under default stub provider wiring

## Phase 4: User Story 1 — Live Trend Research path (P1)

**Goal**: Ollama runner produces contract-valid JSON mapped into Shared Context.

**Independent Test**: Mocked fetch success → invoke returns schema-valid object; with real Ollama (manual) Trend Research completes with non-fixture context.

- [x] T011 [P] [US1] Implement `prompt-template.renderer.ts` in `src/modules/executions/services/` (`{{var}}` interpolation; required vars missing → throw)
- [x] T012 [P] [US1] Implement `json-output.parser.ts` in `src/modules/executions/services/` (fence strip, 1 MiB cap, schema validate when non-trivial)
- [x] T013 [US1] Implement `OllamaAgentRunnerService` in `src/modules/executions/services/ollama-agent-runner.service.ts` (resolve agent+prompt, render, `/api/chat`, timeout=min(env, agent), full Prompt+response logs, throw on errors)
- [x] T014 [P] [US1] Unit tests for renderer + parser in `src/modules/executions/services/prompt-template.renderer.spec.ts` and `json-output.parser.spec.ts`
- [x] T015 [US1] Unit tests for Ollama runner with mocked `fetch` (success, timeout, non-JSON, schema fail, oversize) in `src/modules/executions/services/ollama-agent-runner.service.spec.ts`
- [x] T016 [US1] Align `specs/014-llm-agent-runner/quickstart.md` + contracts with implemented env names and demo path

## Phase 5: User Story 3 — Clear live failures (P1)

**Goal**: Missing Prompt / unreachable LLM / bad JSON / schema / missing required vars never silent-succeed.

**Independent Test**: Each failure class covered by T015 assertions + orchestrator still surfaces step errors.

- [x] T017 [US3] Ensure Ollama runner throws distinct clear errors for missing/disabled Prompt, missing required vars, HTTP/timeout, non-JSON, schema, oversize in `ollama-agent-runner.service.ts`
- [x] T018 [US3] Confirm orchestrator retry/fail path still applies when runner throws (extend orchestrator/execution tests if a gap exists under `src/modules/executions/`)

## Phase 6: User Story 5 — Seed harden 008–013 (P2)

**Goal**: All fashion Agents/Prompts JSON-ready; idempotent seed.

**Independent Test**: Seed twice; no duplicate codes; schemas/prompts tightened.

- [x] T019 [P] [US5] Tighten fashion Agent `outputSchema` for Workflows 008–013 in `src/infrastructure/database/seeds/agents.seed.ts`
- [x] T020 [P] [US5] Update fashion Prompt templates/messages for JSON-only instructions in `src/infrastructure/database/seeds/prompts.seed.ts`
- [x] T021 [US5] Verify seed idempotency (re-run seed script / document check) without duplicate active codes

## Phase 7: User Story 4 — Operator config switch (P2)

**Goal**: Env-only switch + documented quickstart.

**Independent Test**: Follow quickstart stub ↔ ollama switch instructions.

- [x] T022 [US4] Finalize `.env.example` + `specs/014-llm-agent-runner/quickstart.md` operator steps (pull model, env, execute, observe logs/context)
- [x] T023 [US4] Update BACKLOG Notes/Status toward Implementing when coding starts; keep Spec path `specs/014-llm-agent-runner`

## Phase 8: Polish

- [x] T024 [P] Run targeted Jest for executions + env validation + new Ollama specs; fix regressions
- [x] T025 Sync `specs/014-llm-agent-runner/contracts/` types with final env/constraint constants if anything drifted
- [x] T026 Update `docs/product/BACKLOG.md` LLM Agent Runner status/notes when feature implementation completes (after `/speckit-implement` DoD)

## Dependencies

```text
T001–T002 (Setup)
    → T003–T007 (Foundational DI + env + Prompt resolve + orchestrator inject)
        → T008–T010 (US2 stub safety)
        → T011–T016 (US1 live runner)  [T011‖T012 then T013 then T014‖T015]
            → T017–T018 (US3 failure clarity; mostly hardening of T013/T015)
        → T019–T021 (US5 seeds; can parallel with US1 after T007)
        → T022–T023 (US4 docs; after T003 + T013)
            → T024–T026 (Polish)
```

- US2 can be validated as soon as T005–T006 + T008–T010 land.
- US1 requires T007 + T011–T015.
- US5 is independent of Ollama code but should land before claiming full catalog live-ready.
- US4 is docs/ops after env + runner exist.

## Parallel example

```text
T002 ‖ T004
T011 ‖ T012
T014 ‖ T015
T019 ‖ T020
```

## MVP scope (first implement slice)

Per feature-development: implement **ONE task at a time**. Suggested first MVP vertical:

1. T003–T007 (foundation)
2. T008–T010 (stub safety)
3. T011–T015 (live runner + tests)
4. Then seeds/docs (T019–T022)

Primary demo AC: `kids-fashion-trend-research` under `AGENT_RUNNER=ollama`.

## Implementation notes

- No new public REST routes; no `modules/llm` domain module.
- Do **not** implement Tool Runtime (015).
- Default `AGENT_RUNNER=stub`; full Prompt/response logging; 120s default timeout; 1 MiB max body.
- Non-fixture proof: schema-valid ∧ not identical to stub fixture for same agent/input.
