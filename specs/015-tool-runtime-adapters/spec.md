# Feature Specification: Tool Runtime Adapters

**Feature Branch**: `015-tool-runtime-adapters`

**Created**: 2026-07-16

**Status**: Implemented

**Input**: User description: "Phase 2.5 second feature — make Tool Library entries invokable at Execution time (starting with search/browser for Kids Fashion research/image paths) so Agents with toolRefs receive real tool results while running under the Ollama (or stub) agent runner — without inventing fashion-specific tool modules. Port ToolInvoker + registry keyed by toolType/code; resolve tool version config; secrets via env mapped by secret_ref; MVP adapters for web-search and web-browser (local/free first); image-generation/object-storage local or stub-live acceptable; integrate with Agent runner; tool failure → step fail/retry; CI flag for stub/no-op tools; no new public tool-execute REST API."

## Clarifications

### Session 2026-07-16

- Q: Primary Agent ↔ tool integration strategy? → A: **Pre-step enrichment** — invoke all declared `toolRefs`, inject results into prompt/input, then a single LLM call. Function-calling loop is out of scope for MVP (Option A).
- Q: Primary `web-search` / paid-provider strategy? → A: **Free live MVP (DuckDuckGo-style)** as the default runnable path; keep **commented / non-executed scaffolding** for **Google Custom Search** as the intended future paid provider (selected by product). Paid path MUST NOT be required for MVP or CI.
- Q: `web-browser` / `image-generation` / `object-storage` MVP vs future paid? → A:
  - **`web-browser`**: live MVP = native HTTP fetch + constrained text extract; **commented scaffolding** for **Browserless** (future).
  - **`image-generation`**: MVP = **stub-live local** adapter (deterministic/local placeholder assets); **commented scaffolding** for **Flux cloud** (future).
  - **`object-storage`**: MVP = **local filesystem** storage adapter; **commented scaffolding** for **AWS S3** (future).
- Q: Stub LLM + live tools? → A: When `AGENT_RUNNER=stub`, do **not** invoke live tool adapters; stub fixtures remain authoritative.
- Q: Evidence of tool use for acceptance? → A: Enrichment payload included in the rendered Prompt (and debug logs of tool results with size limits); optional step metadata summary of which tool codes ran.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Tools Enrich Kids Fashion Research Steps (Priority: P1)

An operator with execute permission runs a published Kids Fashion Workflow (e.g. Trend Research) whose Agent declares `toolRefs` including `web-search`, while live tool adapters are enabled and the live LLM runner is active. During the agent step, declared tools are invoked (pre-step enrichment) and their results are injected into the prompt/input so Shared Context outputs can reflect real external data — not only static Prompt text and model prior knowledge.

**Why this priority**: This is the primary Phase 2.5 outcome for tools — proving catalog Tools are real capabilities at Execution time, not metadata-only.

**Independent Test**: With live tools enabled and live LLM runner active, start Execution of a Kids Fashion Workflow whose research Agent has `web-search` in `toolRefs`; complete the step; confirm search enrichment appears in the rendered Prompt / debug diagnostics and Shared Context research outputs can reflect that data.

**Acceptance Scenarios**:

1. **Given** live tool adapters are enabled and an Agent version lists `web-search` in `toolRefs`, **When** that agent step runs under the live LLM runner, **Then** the System resolves the published enabled Tool, invokes the free search adapter, injects results into the prompt/input (pre-step enrichment), then performs the LLM call.
2. **Given** a completed step that used live `web-search`, **When** an operator inspects debug logs / documented diagnostics (and optional step metadata), **Then** there is observable evidence of tool use (tool codes invoked + enrichment present in rendered Prompt).
3. **Given** the same Workflow definitions and Tool catalog codes as Milestone 2 / Phase 2.5 Card 1, **When** live tools are used, **Then** no new public Tool-execute REST API and no fashion-specific NestJS module are required.

---

### User Story 2 - CI and Local Dev Can Disable Live Tools (Priority: P1)

A developer or CI job runs the platform with live tool adapters disabled (or forced stub/no-op). Executions do not require external network access for tools; existing stub LLM path and unit tests remain green.

**Why this priority**: Phase 2.5 must keep CI offline-safe; live HTTP adapters must not be mandatory for everyday test runs.

**Independent Test**: With tools forced stub/disabled, run unit tests and start a Kids Fashion Workflow; confirm no required external tool network calls.

**Acceptance Scenarios**:

1. **Given** configuration that disables live tool adapters (stub/no-op tools), **When** existing Execution / agent-runner / tool unit tests run, **Then** they pass without requiring external search/browser network services.
2. **Given** stub/no-op tool mode and live LLM runner, **When** an Agent with `toolRefs` runs, **Then** the step does not fail solely because live adapters are off; tool enrichment is skipped or replaced with documented empty/stub tool results, and the LLM call proceeds.
3. **Given** an invalid tool-runtime configuration value (e.g. unknown mode), **When** the platform boots, **Then** startup fails fast with a clear configuration error.

---

### User Story 3 - Tool Failures Surface as Agent Step Failures (Priority: P1)

An operator runs a step whose declared tool is disabled, soft-deleted, unsupported, times out, or returns an adapter error. The agent step fails (or retries then fails) with a clear observable error on the Execution/step — never a silent success that pretends tools ran.

**Why this priority**: Operators must diagnose tool problems through existing Execution surfaces; silent skip would corrupt research quality.

**Independent Test**: Force each failure class with mocked adapters; confirm step/Execution error and participation in existing retry semantics.

**Acceptance Scenarios**:

1. **Given** an Agent `toolRefs` entry pointing to a missing, soft-deleted, or disabled Tool, **When** the step runs with live tools enabled, **Then** the step fails with a clear error and the tool is not invoked.
2. **Given** a declared tool whose type/code has no registered adapter, **When** the step runs with live tools enabled, **Then** the step fails with an explicit unsupported-tool error (not silent skip).
3. **Given** a tool adapter timeout or provider error, **When** the step runs, **Then** the step fails or retries then fails per existing agent/node timeout and retry semantics; the error is visible on the Execution/step.
4. **Given** tool `timeout_ms` / `max_retries` on the Tool version, **When** the adapter is invoked, **Then** those limits are enforced where applicable (in addition to agent/node limits, with documented precedence).

---

### User Story 4 - Browser Fetch Supports Reference/Image Research Paths (Priority: P2)

An operator runs a Kids Fashion step whose Agent declares `web-browser` (e.g. image search / style analysis paths). The System uses the MVP native fetch + text extract adapter (not Browserless) to obtain constrained page text for the agent step.

**Why this priority**: Several Milestone 2 Agents already wire `web-browser`; research quality depends on page content, not search snippets alone.

**Independent Test**: With live tools enabled and a mocked or local-friendly fetch target, run an Agent with `web-browser` in `toolRefs`; confirm extracted text is available via enrichment within size limits.

**Acceptance Scenarios**:

1. **Given** live tools enabled and `web-browser` in `toolRefs`, **When** the step runs with a valid URL input mapped for the tool, **Then** the MVP fetch/extract adapter returns constrained extracted text for enrichment.
2. **Given** fetched content exceeds the documented size limit (**256 KiB**), **When** extraction completes, **Then** content is truncated with a marker (MUST NOT unbounded-buffer the orchestrator).
3. **Given** the target URL is unreachable or returns an error status, **When** the browser adapter runs, **Then** the step fails or retries then fails with a clear error.

---

### User Story 5 - Operators Configure Adapters via Env and Seeded Tool Config (Priority: P2)

An operator enables live tools, supplies any needed env for free/local adapters, and follows a quickstart to run at least the `web-search` path on a Kids Fashion Agent that already has `toolRefs`. Seed documents free/local provider shapes; future paid provider env keys MAY be listed as commented placeholders in `.env.example` without being required.

**Why this priority**: Ops must switch modes without new admin APIs; catalog remains the source of tool metadata.

**Independent Test**: Follow quickstart: configure env → enable live tools → execute a Workflow whose Agent has `web-search` → observe enrichment; re-run seed twice with no duplicate tool codes.

**Acceptance Scenarios**:

1. **Given** documented env keys for adapter enablement (and optional future paid placeholders), **When** an operator configures live tools and restarts/reloads per platform norms, **Then** subsequent Executions use free/local live adapters for supported tools.
2. **Given** Tool versions with `secret_ref` for future paid providers, **When** MVP free/local adapters run, **Then** those paid secrets are not required; when a paid provider path is later enabled, secrets MUST come from env — never plaintext in DB.
3. **Given** platform seed after this feature, **When** seed runs twice, **Then** Tool codes remain unique (idempotent) and `config_json` matches documented free/local provider shapes (with optional commented notes for future paid providers).
4. **Given** the quickstart, **When** followed with live tools and live LLM, **Then** at least one Kids Fashion Agent with `web-search` demonstrates the live free search enrichment path.

---

### User Story 6 - Image Generation (Stub-Live) and Object Storage (Filesystem) (Priority: P3)

Agents that already reference `image-generation` and/or `object-storage` run successfully under live tools without paid cloud: image uses a stub-live local adapter; object storage writes/reads via **local filesystem**. Commented scaffolding documents the future **Flux cloud** and **AWS S3** paths without executing them in MVP.

**Why this priority**: Wired on fashion Agents today; free/local MVP unblocks live-tools mode without mandatory paid cloud.

**Independent Test**: With live tools + live LLM, run an Agent with `image-generation` and/or `object-storage` in `toolRefs`; confirm stub-live image result and filesystem storage result are produced; CI stub tool mode still skips live adapters under stub LLM.

**Acceptance Scenarios**:

1. **Given** live tools enabled and `image-generation` in `toolRefs`, **When** the step runs under live LLM runner, **Then** the stub-live local image adapter returns a usable placeholder result for enrichment (no Flux cloud call required).
2. **Given** live tools enabled and `object-storage` in `toolRefs`, **When** the step runs under live LLM runner, **Then** the local filesystem adapter stores/resolves objects under a configured local root path (no AWS S3 call required).
3. **Given** stub LLM runner mode, **When** those Agents run, **Then** existing deterministic fixture demos remain usable (live tools are not invoked).

---

### Edge Cases

- Live tools enabled but Agent has empty `toolRefs` → agent step proceeds without tool invokes (LLM-only).
- Live tools disabled / stub tool mode + non-empty `toolRefs` → skip live adapters; use empty/stub enrichment; do not call external providers.
- Soft-deleted or disabled Tool code in `toolRefs` → fail step; do not invoke.
- Unknown tool type/code with no adapter → fail with unsupported error; do not silent-skip.
- Tool timeout vs agent/node timeout → enforce both; step fails when either budget is exceeded.
- Extremely large search/browser payloads → truncate with marker at **256 KiB** per tool result body.
- Secret missing for a **required** paid provider that was explicitly selected later → fail clearly; MVP free/local paths MUST NOT require those secrets.
- Concurrent Executions → tool invokes are isolated per step/Execution; no cross-run result bleed.
- Cancel in-flight Execution during tool call → existing cancel semantics; best-effort abort of in-flight HTTP where practical.
- Stub LLM runner + live tools enabled → System MUST NOT invoke live tool adapters; stub fixtures remain the sole step output path.
- Prompt/model requests tools beyond declared `toolRefs` → only declared `toolRefs` are eligible; undeclared tools MUST NOT be invoked.
- Future paid provider scaffolding (Google Custom Search, Browserless, Flux, AWS S3) → present as **commented / non-executed** code and documented `.env.example` placeholders only in MVP; selecting them as active providers is out of scope until a follow-up feature enables them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an internal Tool invoke capability (ToolInvoker or equivalent) that resolves Tools declared in Agent version `toolRefs[]` and dispatches to adapters by Tool code and/or `toolType`.
- **FR-002**: System MUST resolve each `toolRefs` entry to a published, enabled, non-soft-deleted Tool and its current/pinned version config (`config_json`, schemas, `secret_ref`, `timeout_ms`, `max_retries`). Resolution failures MUST fail the agent step with a clear error.
- **FR-003**: System MUST register adapters for Kids Fashion tool codes: `web-search`, `web-browser`, `image-generation`, and `object-storage`. Unknown tool types/codes MUST produce an explicit unsupported error when live tools are enabled (not silent skip).
- **FR-004**: System MUST integrate tool invocation with the Agent runner using **pre-step enrichment only**: invoke all declared `toolRefs` (in list order), inject structured tool results into prompt/input, then perform a single LLM call. Model tool/function-calling loops are out of scope for MVP.
- **FR-005**: Tool results MUST be available to the model/prompt via enrichment so Shared Context outputs can reflect external data when live tools and live LLM are used together on Agents that declare `toolRefs`.
- **FR-006**: Tool adapter timeouts and errors MUST cause the agent step to fail or retry then fail according to existing Execution retry semantics; tool limits from Tool version (`timeout_ms`, `max_retries`) MUST be applied where applicable.
- **FR-007**: System MUST support configuration to disable live adapters and force stub/no-op tool results for CI and offline development. Default MUST keep CI safe (live tools off / stub unless explicitly enabled).
- **FR-008**: Secrets referenced by Tool `secret_ref` MUST be supplied via environment/configuration mapping — never stored as plaintext credentials in Tool catalog rows. MVP free/local adapters MUST NOT require paid-provider secrets.
- **FR-009**: System MUST NOT add a new public end-user “execute tool” REST API. Tool runtime is internal to Execution only. Existing Tools CRUD remains the catalog surface.
- **FR-010**: System MUST NOT introduce a fashion-specific NestJS module for tools. Adapters are infrastructure behind Tool Library metadata, used by Execution / Agent runner.
- **FR-011**: `web-search` MVP MUST use a **free DuckDuckGo-style** search path as the default runnable provider. Implementation MUST include **commented / non-executed scaffolding** for **Google Custom Search** (future paid path selected by product). Google Custom Search MUST NOT be required for MVP or CI.
- **FR-012**: `web-browser` MVP MUST use **native HTTP fetch + constrained text extract** (size-limited). Implementation MUST include **commented / non-executed scaffolding** for **Browserless** (future). MUST NOT implement a full scraping farm or unbounded crawl in MVP.
- **FR-013**: `image-generation` MVP MUST use a **stub-live local** adapter (placeholder/local asset result). Implementation MUST include **commented / non-executed scaffolding** for **Flux cloud** (future). Flux MUST NOT be required for MVP.
- **FR-014**: `object-storage` MVP MUST use a **local filesystem** adapter under a configured root directory. Implementation MUST include **commented / non-executed scaffolding** for **AWS S3** (future). AWS MUST NOT be required for MVP.
- **FR-015**: Platform seed MUST update Tool `config_json` to documented free/local provider shapes idempotently without duplicating Tool codes. Future paid provider names MAY appear as documentation/comments in seed or `.env.example` only.
- **FR-016**: System MUST provide operator quickstart covering: enable live tools → run free `web-search` enrichment on a Kids Fashion Agent → observe influence; filesystem root for object-storage; and how to keep stub/no-op tools for CI. Quickstart MUST note future paid providers (Google CSE, Browserless, Flux, AWS) as not enabled in MVP.
- **FR-017**: Automated tests MUST cover: ToolInvoker resolve/dispatch; free/local adapter success and failure with mocked HTTP where applicable; filesystem storage success; disabled/missing/unsupported tool failure; CI stub/no-op path without external network.
- **FR-018**: Logs and diagnostics MUST omit secret values. Tool result bodies MAY be logged at debug level with size limits; operators MUST treat tool result logs as potentially sensitive.
- **FR-019**: System MUST enforce a maximum tool result body size of **256 KiB** per invoke for `web-search` and `web-browser` (truncate with marker when exceeded).
- **FR-020**: When `AGENT_RUNNER=stub`, System MUST NOT invoke live tool adapters even if live tools are enabled.

### Key Entities

- **Tool (existing)**: Catalog entry identified by `code`; enabled/published lifecycle; soft-delete.
- **Tool Version (existing)**: `tool_type`, `config_json`, input/output schemas, `secret_ref`, `timeout_ms`, `max_retries`.
- **Agent Version toolRefs (existing)**: List of Tool codes the agent may use at runtime (invoked in order for enrichment).
- **Tool Adapter**: Runtime implementation for a tool type/code (free/local MVP, plus commented future paid scaffolding).
- **Tool Enrichment Bundle**: Structured results from all invoked `toolRefs` injected into prompt/input before the LLM call.
- **Tool Runtime Mode**: Configuration choosing live adapters vs stub/no-op for CI.
- **Local Object Storage Root**: Configured filesystem directory used by the MVP `object-storage` adapter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With live tools disabled (stub/no-op), 100% of in-scope automated tests pass without requiring external search/browser network services.
- **SC-002**: With live tools enabled and live LLM runner, an operator following quickstart can complete a Kids Fashion Execution whose Agent has `web-search` and observe free-search enrichment in the rendered Prompt / diagnostics.
- **SC-003**: 100% of in-scope tool failure classes (missing/disabled/soft-deleted tool, unsupported adapter, timeout/provider error) produce an observable step/Execution error rather than silent success when live tools are enabled.
- **SC-004**: Invalid tool-runtime mode configuration prevents platform startup (fail fast) in 100% of invalid-value cases covered by config validation tests.
- **SC-005**: No new public “execute tool” REST routes are introduced; operators continue to use existing Execution observation APIs.
- **SC-006**: Repeated platform seed after tool config updates creates zero duplicate active Tool codes.
- **SC-007**: `web-search` / `web-browser` result bodies never exceed 256 KiB in memory for a single invoke after truncate-with-marker.
- **SC-008**: LLM Agent Runner (Card 1) behavior remains intact: stub default and live LLM path still work; this feature adds tool runtime only.
- **SC-009**: With live tools + live LLM, Agents referencing `object-storage` can write/resolve objects via local filesystem without AWS credentials; Agents referencing `image-generation` receive stub-live local results without Flux credentials.

## Assumptions

- LLM Agent Runner (`specs/014-llm-agent-runner`) is Done and provides a pluggable Agent runner; this feature extends that path rather than replacing it.
- Tool Library (`specs/007-tool-library`) and Kids Fashion Agent `toolRefs` wiring already exist; this feature does not redesign catalog CRUD.
- Primary demo path for tools is an Agent that already has `web-search` (e.g. fashion trend research), not a new Workflow topology.
- Default configuration keeps CI offline-safe (live tools off / stub unless explicitly enabled).
- MVP runnable providers are free/local only; product-selected future paid providers are Google Custom Search, Browserless, Flux cloud, and AWS S3 — scaffolded as comments only in this feature.
- No new public Tool-execute API; no CMS publish, scheduling, marketplace, or Phase 3 modules.
- Kids Fashion Workflow graph codes/topology are not rewritten solely to showcase tools.
- Existing Auth + Execution permissions are unchanged.
- DOMAIN.md / ENGINEERING_GUIDE.md are not present in-repo; ARCHITECTURE.md, SYSTEM_DESIGN.md, and WORKFLOW_ENGINE.md govern engineering constraints.
- When `AGENT_RUNNER=stub`, live tool adapters are not invoked even if live tools are enabled; stub fixtures remain authoritative for CI/demos.
- Pre-step enrichment is the only MVP integration strategy; function-calling is deferred.
- Default size cap for search/browser tool result bodies is **256 KiB** with truncate-with-marker.
- “DuckDuckGo-style” means a free search approach suitable for local demos (HTML or unofficial API as chosen in plan); exact client library is an implementation detail for planning.
- Local filesystem object-storage root is configured via env (e.g. a data directory under the app or operator-chosen path); not a networked object store in MVP.
