# Tasks: Tool Runtime Adapters

**Input**: Design documents from `/specs/015-tool-runtime-adapters/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included (FR-017 / SC-001 require ToolInvoker + adapter unit tests with mocked HTTP / temp FS; CI stub path)

## Phase 1: Setup

- [x] T001 Confirm branch `015-tool-runtime-adapters` and feature docs under `specs/015-tool-runtime-adapters/` match BACKLOG Spec path
- [x] T002 [P] Document env keys in `.env.example` (`TOOL_RUNTIME`, `TOOL_STORAGE_ROOT`, `TOOL_RESULT_MAX_BYTES`) plus **commented** future paid placeholders (Google CSE, Browserless, Flux, AWS S3)

## Phase 2: Foundational (blocking)

- [x] T003 Extend Joi + config loaders in `src/common/config/env.validation.ts`, `src/common/config/misc.config.ts`, `src/common/config/config.type.ts` for `TOOL_RUNTIME` (`stub`|`live`, default `stub`), `TOOL_STORAGE_ROOT`, `TOOL_RESULT_MAX_BYTES` (default 262144); invalid `TOOL_RUNTIME` fails bootstrap
- [x] T004 [P] Add constants in `src/modules/executions/constants/tool-runtime.constants.ts` (`TOOL_RUNTIME` token/modes, max bytes, MVP tool codes)
- [x] T005 Add worker-safe Tool resolve by code (published+enabled+not soft-deleted + published version) in `src/modules/tools/services/tools.service.ts` (mirror Prompts `resolvePublishedByCode`); export via `src/modules/tools/tools.module.ts`
- [x] T006 Create `ToolAdapter` interface + `ToolInvoker` service + registry skeleton in `src/modules/executions/tools/` (`tool-adapter.ts`, `tool-invoker.service.ts`, `tool-registry.ts`)
- [x] T007 Wire `ToolsModule` import + `ToolInvoker` providers in `src/modules/executions/executions.module.ts`

## Phase 3: User Story 2 — CI / stub tools safety (P1)

**Goal**: Default `TOOL_RUNTIME=stub`; invalid mode fails fast; stub LLM never calls live tools.

**Independent Test**: Default env — unit tests pass offline; `AGENT_RUNNER=stub` + `TOOL_RUNTIME=live` still skips tool HTTP.

- [x] T008 [US2] Enforce FR-020 in `src/modules/executions/llm/llm-agent-runner.service.ts`: skip `ToolInvoker` when `AGENT_RUNNER=stub` or `TOOL_RUNTIME=stub`
- [x] T009 [P] [US2] Unit test invalid `TOOL_RUNTIME` rejected by env schema (extend existing env validation spec or add under `src/common/config/`)
- [x] T010 [US2] Unit test proving stub Agent runner path never calls ToolInvoker (mock invoker not invoked) in `src/modules/executions/llm/llm-agent-runner.service.spec.ts` or dedicated spec

## Phase 4: User Story 1 — Live web-search enrichment (P1)

**Goal**: Free DuckDuckGo-style search + pre-step enrichment into live LLM Prompt.

**Independent Test**: Mocked search `fetch` → enrichment block in messages; Trend Research Agent with `web-search` toolRef gets results before `chat()`.

- [x] T011 [P] [US1] Implement `web-search.adapter.ts` in `src/modules/executions/tools/adapters/` (DuckDuckGo-style live via `fetch`; 256 KiB truncate; throw on failure; include **commented** Google Custom Search scaffolding)
- [x] T012 [US1] Register `web-search` in tool registry; implement `ToolInvoker.invokeAll` (resolve → adapter → ordered results; missing/disabled/unsupported → throw) in `src/modules/executions/tools/tool-invoker.service.ts`
- [x] T013 [US1] Wire pre-step enrichment in `src/modules/executions/llm/llm-agent-runner.service.ts`: load `toolRefs` from agent version → invoke tools → append `[Tool enrichment]` JSON message → then LLM `chat()`; debug-log enrichment (no secrets)
- [x] T014 [P] [US1] Unit tests for web-search adapter (mocked `fetch` success/fail/truncate) in `src/modules/executions/tools/adapters/web-search.adapter.spec.ts`
- [x] T015 [US1] Unit tests for ToolInvoker resolve/dispatch + LlmAgentRunner enrichment wiring (mocked invoker/adapter) in `src/modules/executions/tools/tool-invoker.service.spec.ts` and extend `llm-agent-runner.service.spec.ts`

## Phase 5: User Story 3 — Tool failures surface as step failures (P1)

**Goal**: Missing/disabled/unsupported/timeout tool errors fail the agent step clearly.

**Independent Test**: Each failure class throws; orchestrator retry/fail unchanged.

- [x] T016 [US3] Ensure ToolInvoker throws distinct clear errors for missing/soft-deleted/disabled tool, unsupported adapter, timeout/provider error in `src/modules/executions/tools/tool-invoker.service.ts`
- [x] T017 [P] [US3] Unit tests covering failure classes in `src/modules/executions/tools/tool-invoker.service.spec.ts`
- [x] T018 [US3] Apply tool `timeout_ms` / `max_retries` from tool version during invoke; document precedence vs agent timeout in code comments / quickstart

## Phase 6: User Story 4 — web-browser fetch/extract (P2)

**Goal**: Native fetch + constrained text extract; Browserless commented only.

**Independent Test**: Mocked HTML fetch → truncated text in enrichment.

- [x] T019 [P] [US4] Implement `web-browser.adapter.ts` in `src/modules/executions/tools/adapters/` (http(s) only; strip/extract; 256 KiB truncate-with-marker; **commented** Browserless scaffolding)
- [x] T020 [P] [US4] Register `web-browser` in registry; unit tests mocked fetch success/fail/oversize in `src/modules/executions/tools/adapters/web-browser.adapter.spec.ts`

## Phase 7: User Story 5 — Env, seed, quickstart (P2)

**Goal**: Seeded free/local `config_json`; ops docs; idempotent seed.

**Independent Test**: Seed twice; no duplicate tool codes; quickstart matches env names.

- [x] T021 [US5] Update `src/infrastructure/database/seeds/tools.seed.ts` `config_json` to free/local shapes (`duckduckgo`, `native-fetch`, `stub-live`, `filesystem`) idempotently
- [x] T022 [P] [US5] Finalize `.env.example` + `specs/015-tool-runtime-adapters/quickstart.md` (live tools + Ollama demo; CI stub; note future paid not enabled)
- [x] T023 [US5] Sync `specs/015-tool-runtime-adapters/contracts/` types with final env/constants if drifted

## Phase 8: User Story 6 — Image stub-live + filesystem storage (P3)

**Goal**: Stub-live image + local filesystem storage; Flux/AWS commented only.

**Independent Test**: Temp dir put/get; image enrichment returns stub-live provider without Flux.

- [x] T024 [P] [US6] Implement `image-generation.adapter.ts` (stub-live placeholder result; **commented** Flux scaffolding) in `src/modules/executions/tools/adapters/`
- [x] T025 [P] [US6] Implement `object-storage.adapter.ts` (filesystem under `TOOL_STORAGE_ROOT`; path-traversal safe; **commented** AWS S3 scaffolding) in `src/modules/executions/tools/adapters/`
- [x] T026 [US6] Register both adapters; unit tests (temp dir FS + stub-live image) in `*.adapter.spec.ts`

## Phase 9: Polish

- [x] T027 [P] Run targeted Jest for executions tools + llm-agent-runner + env validation; fix regressions
- [x] T028 Update `docs/product/BACKLOG.md` Tool Runtime Adapters Status/Notes when implementation completes (after `/speckit-implement` DoD)

## Dependencies

```text
T001–T002 (Setup)
    → T003–T007 (Foundational config + Tool resolve + invoker skeleton + module wire)
        → T008–T010 (US2 stub/CI safety)
        → T011–T015 (US1 web-search + enrichment)  [T011 then T012–T013; T014‖T015]
            → T016–T018 (US3 failure/timeout hardening)
        → T019–T020 (US4 browser; after T006–T007)
        → T021–T023 (US5 seed/docs; after T003)
        → T024–T026 (US6 image/storage; after T006–T007)
            → T027–T028 (Polish)
```

- MVP slice = Phase 1–5 (US2 + US1 + US3) with `web-search` enrichment.
- US4/US6 can proceed in parallel after foundational invoker exists.
- US5 seed/docs can parallel US4/US6 after env keys exist.

## Parallel example

```text
T002 ‖ T004
T014 ‖ T015
T019 ‖ T020
T024 ‖ T025
```

## Suggested MVP scope

Implement through **T018** (Setup + Foundational + US2 + US1 + US3) so Trend Research + `web-search` live enrichment works with CI-safe defaults. Then US4 → US6 → polish.

## Implementation note

Per feature-development workflow: `/speckit-implement` executes **ONE unfinished task at a time**.
