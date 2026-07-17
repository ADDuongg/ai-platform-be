# Feature Specification: LLM Agent Runner (Ollama)

**Feature Branch**: `014-llm-agent-runner`

**Created**: 2026-07-16

**Status**: Implemented

**Input**: User description: "Phase 2.5 first feature — replace MVP stub-only agent invoke with a pluggable LLM Agent Runner that calls a local LLM (Ollama) so the six published Kids Fashion Workflows can produce real structured JSON into Shared Context when enabled, while keeping stub as the default for CI/tests. No new public REST resources. No tool calling (next feature). No cloud LLM providers in this feature. Configuration-driven; Agent Independence; extend Execution runtime only."

## Clarifications

### Session 2026-07-16

- Q: How should “live / non-fixture” outputs be proven for acceptance? → A: Contract-valid JSON **and** not identical to the stub fixture for that agent/input (Option A).
- Q: What should be logged for live LLM invokes? → A: Log full rendered Prompt + full model response body (debug-friendly) (Option A).
- Q: What is the default live LLM call timeout? → A: 120 seconds default, overridable via config / Agent timeout (Option B).
- Q: What is the seed hardening scope for live JSON? → A: Harden all 008–013 fashion Agents/Prompts (output contracts + JSON-only instructions) (Option A).
- Q: What is the max live model response size? → A: 1 MiB max response body; larger responses fail the step (Option B).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Kids Fashion Trend Research with Live Local LLM (Priority: P1)

An operator with execute permission starts the published **Kids Fashion Trend Research** Workflow while the platform is configured to use the live local LLM runner. The Workflow completes successfully, and Shared Context contains a real model-produced `researchReport` (and intermediate keys per existing Workflow mapping) — not the deterministic stub fixture content.

**Why this priority**: This is the primary Phase 2.5 outcome — proving published Milestone 2 Workflows can run with a real local model without changing Workflow definitions or adding fashion-specific modules.

**Independent Test**: With local LLM available and live runner enabled, start Execution of `kids-fashion-trend-research` with valid required inputs; wait until `completed`; confirm Shared Context research outputs pass Agent output contracts and are **not byte-identical** to the stub fixture for the same agent/input.

**Acceptance Scenarios**:

1. **Given** local LLM is reachable and the platform is configured for the live runner, **When** an authorized user starts published `kids-fashion-trend-research` with valid required inputs, **Then** Execution reaches `completed` and Shared Context includes `researchReport` (and mapped intermediate keys) that (a) satisfy the relevant Agent output contracts and (b) are not identical to the stub fixture payload for those agents/inputs.
2. **Given** a completed live Execution, **When** the operator inspects Execution detail and steps, **Then** each step shows success/failure status as today, and step outputs are JSON objects suitable for existing Shared Context output mapping.
3. **Given** the same Workflow definitions and catalog codes as Milestone 2, **When** live runner is used, **Then** no Workflow graph topology or public API changes are required to start or observe the run.

---

### User Story 2 - Default Stub Path Remains Safe for CI and Demos (Priority: P1)

A developer or CI job runs the platform with the default runner mode (stub). Existing Execution behavior, unit tests, and Kids Fashion seed demos continue to work without requiring a local LLM process.

**Why this priority**: Phase 2.5 must not break the stub-backed Milestone 2 delivery path; stub remains the safe default.

**Independent Test**: With default configuration (no live runner override), run existing Execution/stub unit tests and start a Kids Fashion Workflow; confirm deterministic fixture behavior unchanged.

**Acceptance Scenarios**:

1. **Given** default platform configuration (stub runner), **When** existing Execution and stub-fixture tests run, **Then** all pass without a local LLM process.
2. **Given** stub runner mode, **When** an operator starts any published Kids Fashion Workflow (008–013), **Then** behavior matches today’s deterministic fixtures.
3. **Given** an invalid runner mode value in configuration, **When** the platform boots, **Then** startup fails fast with a clear configuration error (no silent fallback to an unintended mode).

---

### User Story 3 - Fail Clearly When Prompt, Model, or Output Contract Breaks (Priority: P1)

An operator starts a Workflow under the live runner when the Agent’s Prompt is missing/disabled, the local LLM is unreachable, the model returns non-JSON, or the response fails the Agent’s output contract. The step fails (or retries then fails) with an observable error on the Execution/step — never a silent empty success.

**Why this priority**: Live LLM paths are unreliable without explicit failure semantics; operators must diagnose runs using existing Execution surfaces.

**Independent Test**: Force each failure class under live runner; confirm step/Execution error is visible and retry rules from existing agent/node timeouts apply.

**Acceptance Scenarios**:

1. **Given** live runner mode and an Agent whose `promptRef` points to a missing, unpublished, or disabled Prompt, **When** that step runs, **Then** the step fails with a clear error (no silent empty output).
2. **Given** live runner mode and local LLM unreachable or timed out, **When** a step invokes the model, **Then** the step fails or retries then fails per existing timeout/retry semantics, with a clear error on the Execution/step.
3. **Given** live runner mode and a model response that is not valid JSON (or fails the Agent version output contract), **When** the step completes model call handling, **Then** the step fails or retries then fails; Shared Context MUST NOT receive a silently empty “success” object for that step.
4. **Given** live runner mode and a Prompt that declares required variables, **When** mapped step input is missing a required variable, **Then** the step fails with a clear error before treating the model call as successful.

---

### User Story 4 - Operators Can Switch Runner Mode via Configuration Only (Priority: P2)

An operator or developer enables/disables the live local LLM path using environment/configuration only — without new admin REST APIs or fashion-specific modules — and can follow a documented quickstart to pull a local model, set config, and run the primary demo Workflow.

**Why this priority**: Supports local demos and ops without expanding the public API surface.

**Independent Test**: Follow quickstart: start local LLM → set live runner config → execute `kids-fashion-trend-research` → observe real context keys; switch back to stub → fixtures return.

**Acceptance Scenarios**:

1. **Given** documented configuration keys for runner mode and local LLM endpoint/model, **When** an operator sets live mode and restarts/reloads per platform norms, **Then** subsequent Executions use the live runner.
2. **Given** the quickstart, **When** followed on a machine with local LLM available, **Then** the primary demo path (`kids-fashion-trend-research`) completes with real model outputs.
3. **Given** live mode, **When** other published Kids Fashion Workflows (008–013) are started with valid inputs and tightened catalog contracts, **Then** they remain runnable (may be manually verified; primary automated AC is Trend Research).

---

### User Story 5 - Catalog Contracts Hardened for Live JSON Outputs (Priority: P2)

After seed, **all** Kids Fashion Agents and Prompts used by Workflows 008–013 are tightened so output expectations and Prompt instructions align with documented Shared Context shapes from Milestone 2 specs, instructing JSON-only responses suitable for live model runs — without duplicating catalog codes.

**Why this priority**: Live runs need enforceable contracts across the Milestone 2 catalog; stub fixtures alone are insufficient once the model generates real text.

**Independent Test**: Run seed twice; confirm Agent/Prompt codes unchanged (idempotent); output expectations and Prompt wording support JSON-only structured outputs for **all** fashion Agents used by 008–013.

**Acceptance Scenarios**:

1. **Given** platform seed, **When** seed runs on empty or existing DB, **Then** all 008–013 fashion Agent output contracts and related Prompts are updated/aligned without creating duplicate active codes.
2. **Given** seed already applied, **When** seed runs again, **Then** no duplicate Workflow/Agent/Prompt codes appear.
3. **Given** seed completed, **When** an operator lists Agents/Prompts for Workflows 008–013, **Then** each node Agent has a published enabled Prompt with JSON-oriented instructions compatible with its output contract.

---

### Edge Cases

- Stub mode selected but local LLM is also running → system MUST use stub; ignore local LLM.
- Live mode selected but local LLM process not started → step fails clearly (timeout/unreachable); no hang forever beyond configured timeout (default **120 seconds** unless overridden).
- Model returns JSON wrapped in markdown code fences → system SHOULD attempt to extract a JSON object when reasonably detectable; if still invalid → fail the step.
- Model returns valid JSON that fails Agent output contract → fail (or retry then fail); do not write invalid payload as successful mapped output.
- Missing required Prompt template variables → fail the step with a clear error (no silent substitution of empty strings for required vars).
- Optional Prompt variables absent → omit or substitute empty per documented policy; MUST NOT crash bootstrap.
- Agent without `promptRef` under live mode → fail the step with a clear error (stub may still return fixtures by agent code).
- Extremely large model response → fail if body exceeds **1 MiB**; otherwise respect configured timeout; fail clearly rather than blocking the orchestrator indefinitely.
- Concurrent Executions under live mode → independent Shared Context per Execution; no cross-run context bleed.
- Cancel in-flight Execution while a model call is outstanding → existing cancel semantics apply; best-effort abort of in-flight call where practical without breaking orchestrator invariants.
- Invalid runner mode config at boot → fail fast; do not start accepting traffic with an unknown runner.
- Soft-deleted / disabled Prompt referenced by Agent → fail at step with clear error.
- Tool calling / function calling requested by Prompt text → out of scope; this feature does not invoke Tool Library adapters (next Phase 2.5 feature).
- Live mode logging includes full Prompt and full model response bodies → operators MUST treat log sinks as sensitive in shared/production-like environments; this feature does not add redaction of Prompt/response content beyond omitting config secrets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a selectable Agent invoke mode with at least: `stub` (deterministic fixtures) and `ollama` (live local LLM). Default MUST be `stub`.
- **FR-002**: System MUST select the active Agent runner from validated configuration at bootstrap. Invalid mode values MUST cause startup failure (fail fast).
- **FR-003**: Execution orchestration MUST depend on an Agent runner abstraction (not a hard dependency on the stub concrete type alone) so stub and live runners are interchangeable without changing Workflow definitions.
- **FR-004**: In `stub` mode, System MUST preserve existing deterministic fixture behavior for generic and Kids Fashion Agents, including forced-failure config used by tests.
- **FR-005**: In `ollama` mode, for each agent step the System MUST: resolve the pinned Agent version; load the published enabled Prompt referenced by `promptRef`; render Prompt content with step-mapped input variables; invoke the configured local LLM; parse the model response as a JSON object; validate against the Agent version output contract when a non-trivial schema is present; return the object for existing Shared Context output mapping.
- **FR-006**: Prompt rendering MUST support Prompt `template` and, when present, Prompt `messages` content. Placeholders of the form `{{var}}` MUST be interpolated from mapped step input consistent with Prompt variable expectations.
- **FR-007**: If `promptRef` is missing, or the Prompt is not found / not published / not enabled, the live runner MUST fail the step with a clear error.
- **FR-008**: If a Prompt declares required variables and mapped input omits any required variable, the live runner MUST fail the step with a clear error (no silent success).
- **FR-009**: Local LLM connection settings (base URL, default model, optional timeout) MUST be supplied via validated environment/configuration and documented for operators. Default live LLM call timeout MUST be **120 seconds** when not otherwise specified. Effective timeout for a step MUST be the minimum of (configured LLM timeout, Agent/node `timeoutMs` when set). Per-Agent overrides MAY come from Agent `config` / Prompt `modelHints` with documented precedence: Agent config override → Prompt `modelHints` → environment defaults.
- **FR-010**: Live invoke MUST respect Agent/node timeout and max-retry semantics already used by Execution. Timeouts, unreachable LLM, non-JSON responses, and output-contract validation failures MUST throw/fail so existing step retry/fail behavior applies — never silent empty success.
- **FR-011**: System MUST NOT add new public REST resources for LLM admin, fashion domains, or runner switching. Operators use existing Workflow / Agent / Prompt / Tool / Execution APIs plus environment configuration only.
- **FR-012**: System MUST NOT implement Tool Library invocation / tool calling in this feature (deferred to Tool Runtime Adapters).
- **FR-013**: System MUST NOT add cloud LLM provider adapters (Gemini, Claude, OpenAI, Azure, etc.) in this feature. The runner abstraction MAY remain open for future providers without implementing them now.
- **FR-014**: Platform seed MUST harden **all** Kids Fashion Agents and Prompts used by Workflows 008–013: tighten Agent output contracts and Prompt instructions (JSON-only, shapes aligned with specs 008–013 Shared Context) idempotently without duplicating catalog codes or changing Workflow topology/codes. Trend Research remains the primary automated demo path; other Workflows MUST still be seed-ready for live mode.
- **FR-015**: System MUST provide operator quickstart covering: run local LLM → configure live runner → execute `kids-fashion-trend-research` → observe real Shared Context keys; and how to remain on stub for CI.
- **FR-016**: Automated tests MUST cover: stub regression (unchanged fixtures); live runner success with mocked LLM HTTP; live runner failures (timeout / non-JSON / schema) with mocked LLM HTTP.
- **FR-017**: For live-runner acceptance of Kids Fashion demo outputs, a successful step output MUST (a) be valid JSON conforming to the Agent version output contract and (b) not be identical to the stub fixture object that would be returned for the same agent code and comparable input. Fixture non-identity is the operational definition of “non-fixture / model-produced” for this feature.
- **FR-018**: In live (`ollama`) mode, System MUST log the full rendered Prompt content and the full model response body for each agent invoke (debug-friendly diagnostics). Logs MUST still omit secrets (API keys, credentials) if any appear in configuration; Shared Context persistence remains via existing Execution surfaces.
- **FR-019**: Live model response bodies larger than **1 MiB** MUST fail the step with a clear error (do not accept, map, or treat as success). Configurable lower caps MAY be added later; MVP fixed cap is 1 MiB.


### Key Entities

- **Agent Runner Mode**: Configuration choice selecting stub vs live local LLM invoke path for all Executions in that process.
- **Agent Version (existing)**: Pinned on Execution steps; supplies `promptRef`, input/output contracts, timeout/retry, and optional config overrides for model behavior.
- **Prompt Version (existing)**: Published template and/or messages, variables schema, and optional model hints used to build the live LLM request.
- **Shared Context (existing)**: Per-Execution data store; receives mapped JSON outputs from agent steps unchanged in shape expectations from Milestone 2.
- **Local LLM Endpoint**: Operator-configured base URL and default model used when live mode is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With default (stub) configuration, 100% of existing Execution/stub-fixture automated tests pass without a local LLM process.
- **SC-002**: With live runner enabled and local LLM available, an operator can complete published `kids-fashion-trend-research` end-to-end on the quickstart path, and Shared Context research outputs both pass Agent output contracts and are not identical to stub fixtures for the same agents/inputs.
- **SC-003**: 100% of live-runner failure classes in scope (missing Prompt, unreachable LLM, non-JSON, output-contract failure, missing required Prompt variables) produce an observable step/Execution error rather than silent empty success.
- **SC-004**: Invalid runner mode configuration prevents platform startup (fail fast) in 100% of invalid-value cases covered by config validation tests.
- **SC-005**: No new public fashion/LLM REST routes are introduced; operators continue to use existing Execution observation APIs for run status and context.
- **SC-006**: Repeated platform seed after contract/prompt hardening creates zero duplicate active Workflow/Agent/Prompt codes.
- **SC-007**: A hung/unreachable local LLM does not block a step longer than the effective timeout (default 120 seconds unless overridden); the step fails observably thereafter.
- **SC-008**: Model responses larger than 1 MiB never succeed as mapped step output; the step fails with an observable error.

## Assumptions

- Local LLM means **Ollama** (or Ollama-compatible HTTP API) running on the operator’s machine or reachable network host; operators can pull a suitable chat/instruct model themselves.
- Default runner remains `stub` so CI and contributors without Ollama are unblocked.
- Primary automated acceptance path is `kids-fashion-trend-research`; other 008–013 Workflows are seed-hardened for live JSON and may be verified manually.
- Seed hardening in this feature covers **all** 008–013 fashion Agents/Prompts (not Trend Research only).
- “Non-fixture” means contract-valid JSON that is not identical to the stub fixture for that agent/input (not a subjective “looks real” judgment).
- “Non-trivial” output schema means any schema that is more than an empty/object-wildcard accept-all; when present, live responses MUST validate before success.
- Model responses wrapped in markdown fences are best-effort extracted to JSON; extraction failure is treated as non-JSON failure.
- Missing **required** Prompt variables fail the step; optional variables may render as empty string.
- Default live LLM call timeout is 120 seconds; effective timeout is min(LLM timeout, Agent/node timeout when set).
- Max accepted live model response body size is 1 MiB; oversize fails the step.
- Precedence for model selection: Agent version `config` override → Prompt `modelHints` → environment default model.
- Prompt loading is the live runner’s responsibility (using existing Prompt read capabilities); orchestrator may continue to pass mapped input + agent pin as today.
- Stub fashion fixtures are retained even after live mode ships; they are not deleted.
- Tool calling, streaming, multimodal vision beyond JSON text metadata, and cloud providers are out of scope for this feature.
- Existing authentication and Execution permissions (`workflows:execute`, `executions:*`) are unchanged.
- Live runner logs full Prompt and model response bodies by product choice (local/debug-oriented Phase 2.5); config secrets remain out of logs.
- DOMAIN.md / ENGINEERING_GUIDE.md are not present in-repo; ARCHITECTURE.md, SYSTEM_DESIGN.md, and WORKFLOW_ENGINE.md are the governing engineering docs for this feature.
)
