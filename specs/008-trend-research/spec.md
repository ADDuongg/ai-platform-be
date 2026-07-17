# Feature Specification: Trend Research Workflow

**Feature Branch**: `008-trend-research`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Milestone 2 first feature — Kids Fashion Trend Research Workflow. Deliver a published business Workflow on Platform Foundation (configuration/seed only, not a new domain NestJS module) that researches kids-fashion trends, collects textual/URL references, and generates a structured research report into Shared Context. Reuse existing Workflow/Agent/Prompt/Tool/Execution capabilities. Out of scope: Reference Image and later Fashion workflows, live search/browser/image adapters, new fashion-specific public APIs."

## Clarifications

### Session 2026-07-15

- Q: How should the three Trend Research steps be modeled as Agents? → A: Three dedicated published Agents (one per step).
- Q: How should missing/blank required Execution input (`season`, `category`, `market`) be handled? → A: Reject start (fail fast; do not successfully enqueue a runnable Execution).
- Q: Scope of start-input validation? → A: Generic — Workflow definition declares required input keys; Execution start enforces for any Workflow.
- Q: How are required input keys declared/edited? → A: Keys live in definition JSON; seed sets them for Trend Research; mutate only via existing definition update paths (no new dedicated endpoints).
- Q: How should Prompts be assigned to the three dedicated Agents? → A: Three dedicated published Prompts (one `promptRef` per Agent).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Obtain a Trend Research Report for a Kids Fashion Brief (Priority: P1)

A designer or operator with execute permission starts the published **Kids Fashion Trend Research** Workflow with a brief (season, category, market, optional age band and constraints). The Workflow runs three logical steps in order: research trends → collect references → generate research report. When Execution completes, the Shared Context contains a structured research report plus intermediate findings that a human can review and that later Fashion workflows can consume.

**Why this priority**: This is the first Milestone 2 business outcome — without a runnable Trend Research path, Kids Fashion cannot start.

**Independent Test**: After platform seed, start Execution with sample kids-fashion input; wait until status is completed; confirm context includes `researchReport` with summary, trends, references, and gaps; confirm three steps appear in history.

**Acceptance Scenarios**:

1. **Given** the published Workflow `kids-fashion-trend-research` and a user with execute permission, **When** they start Execution with valid input (`season`, `category`, `market`), **Then** an Execution is created and progresses through trend research, reference collection, and report generation until `completed`.
2. **Given** a completed Execution, **When** they retrieve Execution detail and steps, **Then** each step shows status, and the final Shared Context includes `researchReport` with at least `summary`, `trends`, `references`, and `gaps`.
3. **Given** a completed Execution, **When** they inspect intermediate context, **Then** `trendFindings` and `references` are present (or equivalently nested under documented keys) so later Reference Image work can consume them.
4. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start the Workflow, **Then** access is denied as forbidden.
5. **Given** no valid credentials, **When** they attempt to start or read the Execution, **Then** access is denied as unauthenticated.
6. **Given** missing or blank `season`, `category`, or `market`, **When** a user with execute permission attempts to start Trend Research, **Then** start is rejected with a clear validation error and no runnable Execution is successfully enqueued.
7. **Given** any other published Workflow whose definition declares required input keys, **When** start omits a declared required key, **Then** start is rejected the same way (generic enforcement, not Fashion-only).

---

### User Story 2 - Catalog Ready After Seed (Priority: P1)

An admin (or any authorized reader of published catalogs) finds, after a fresh or repeated platform seed, a published Workflow and supporting Agents/Prompts/Tools already wired so Trend Research is executable without manual registry setup.

**Why this priority**: Configuration-driven delivery depends on idempotent seed; manual wiring is not acceptable for MVP demo path.

**Independent Test**: Run seed twice; list Workflows/Agents/Prompts; confirm `kids-fashion-trend-research` is published with a non-empty graph; node Agents are published and enabled; Prompt and Tool references used by those Agents are valid published+enabled codes; no duplicate active codes.

**Acceptance Scenarios**:

1. **Given** an empty or existing database, **When** platform seed runs, **Then** Workflow `kids-fashion-trend-research` exists as **published** with a non-empty definition (at least three agent nodes and required edges).
2. **Given** seeded Agents for the Workflow nodes, **When** an admin lists them, **Then** three distinct Agents exist (one per step), each published and enabled, with documented input/output expectations suitable for its step.
3. **Given** seeded Prompt and Tool assignments on those Agents, **When** assignment rules are evaluated, **Then** each of the three Agents has a distinct published enabled `promptRef`, and every `toolRefs` entry points to a published enabled catalog item.
4. **Given** seed has already been applied, **When** seed runs again, **Then** no duplicate active Workflow/Agent/Prompt codes are created and the Trend Research catalog remains consistent (idempotent).

---

### User Story 3 - Browse and Understand the Workflow Before Running (Priority: P2)

A designer or operator with read permission opens the published Trend Research Workflow, sees its definition (nodes, edges, mappings) and understands required Execution input fields from documentation/quickstart aligned with the Workflow.

**Why this priority**: Supports safe reuse and handoff; secondary to actually running and seeding.

**Independent Test**: As designer/operator, get published Workflow by code/id; confirm definition readable; confirm draft-only demos are not required to use this Workflow; follow quickstart sample input successfully.

**Acceptance Scenarios**:

1. **Given** a user with Workflow read permission, **When** they retrieve `kids-fashion-trend-research`, **Then** they see published metadata and the published definition graph, including declared required input keys.
2. **Given** the quickstart sample input, **When** they start Execution, **Then** the run succeeds without undocumented required fields.
3. **Given** a viewer (read-only), **When** they open the published Workflow and a completed Execution, **Then** they can read them but cannot mutate definition or start Execution.
4. **Given** a designer with Workflow update permission and a draft version, **When** they update the definition via existing definition update paths to change required input keys, **Then** subsequent starts enforce the updated keys (no new dedicated required-input API required).

---

### User Story 4 - Operational Control of a Failed or Running Run (Priority: P2)

An operator cancels an in-flight Trend Research Execution or retries a failed one using existing Execution capabilities; no special Fashion-only cancel/retry rules are introduced.

**Why this priority**: Ops continuity uses Platform Execution already Done; validates this Workflow behaves like any other published Workflow.

**Independent Test**: Start Execution; cancel while running/pending → cancelled; force a failed path (if fixture supports) → retry → progressed or completed per Execution rules.

**Acceptance Scenarios**:

1. **Given** a Trend Research Execution in `pending` or `running`, **When** an authorized user cancels it, **Then** status becomes `cancelled` and no further successful step completion is expected.
2. **Given** a Trend Research Execution in `failed`, **When** an authorized user retries it, **Then** failed steps may be re-attempted without rewriting the Workflow definition.

---

### Edge Cases

- Missing required input fields (`season`, `category`, or `market`) or blank-only values for Trend Research → **start is rejected** with a clear validation error; a runnable Execution is **not** successfully enqueued. The same reject-at-start behavior applies to any Workflow that declares required input keys in its definition.
- A Workflow definition with **no** declared required input keys → start does not apply this new required-field rejection (unchanged relative to prior Execution behavior aside from other validations).
- Empty or whitespace-only optional constraint/`ageBand` strings → treated as omitted; Execution still proceeds when required fields are present.
- Workflow exists but an Agent referenced by a node is later disabled → new Executions MUST fail validation at start or at the step with a clear error; historical completed Executions remain readable.
- Soft-deleted Workflow code → not startable; after archive + code reuse, only the new active Workflow is startable.
- Concurrent Executions with different inputs → independent; Shared Context is per Execution.
- Stub/fixture agent runner (if live LLM/tools unavailable) → still produces structured JSON matching the documented report shape so P1 acceptance scenarios pass.
- Extremely large input text → rejected or truncated per existing platform limits; no Fashion-specific size rules required beyond documenting documented platform defaults.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a published Workflow with stable code `kids-fashion-trend-research` representing Kids Fashion Trend Research.
- **FR-002**: The Workflow definition MUST include three ordered agent steps that (1) research trends, (2) collect references, and (3) generate a research report, with edges so the report step cannot run successfully before its prerequisites complete. Each step MUST reference a **distinct** published Agent (three dedicated Agents total — not the same Agent code on multiple nodes).
- **FR-003**: System MUST accept Execution input that includes at least non-blank `season`, `category`, and `market` for Trend Research; optional `ageBand` and `constraints` MAY be provided. Required keys for this Workflow MUST be declared in the Workflow definition (configuration). If any declared required field is missing or blank, System MUST **reject start** with a clear validation error and MUST NOT successfully enqueue a runnable Execution.
- **FR-003b**: Required input keys MUST be stored as part of the Workflow definition configuration (JSON). Platform seed MUST set the required keys for `kids-fashion-trend-research`. Authorized users MAY change required keys only by updating the draft definition through existing definition update capabilities; this feature MUST NOT add new dedicated endpoints solely for editing required-input keys. Exact JSON path is chosen in planning.
- **FR-004**: On successful completion, Shared Context MUST include `researchReport` with at least: `summary` (text), `trends` (list), `references` (list of reference items with title and source pointer such as URL or citation), and `gaps` (list). Intermediate keys `trendFindings` and `references` MUST also be available as documented for downstream workflows.
- **FR-005**: System MUST seed Workflow, Agents, Prompts, and Tool assignments required for this Workflow as part of the platform seed flow; seed MUST be idempotent and MUST NOT invent a separate Fashion REST module.
- **FR-006**: Each Workflow node MUST reference a published, enabled Agent; Agents MUST expose input/output expectations consistent with their step (schemas or documented contracts).
- **FR-007**: Each of the three Trend Research Agents MUST reference its own dedicated published enabled Prompt via `promptRef` (three distinct Prompt codes). Research-oriented Agent(s) MUST also reference at least one published enabled search Tool via `toolRefs` (default: existing web search catalog entry). Existing demo prompts (e.g. `research-brief`) MAY remain for other samples but MUST NOT be the sole prompt wiring for all three Fashion Agents.
- **FR-008**: Users MUST start, observe, cancel, and retry Trend Research Executions using the existing Execution capabilities and permissions (`workflows:execute` / `executions:*`); this feature MUST NOT add new permission codes.
- **FR-009**: System MUST NOT require new public Fashion-specific API routes; all management and execution uses existing Workflow, Agent, Prompt, Tool, and Execution surfaces.
- **FR-010**: System MUST NOT implement the Reference Image Workflow, Style Analysis, Design Brief, Image Generation, or Design Review workflows in this feature.
- **FR-011**: System MUST NOT implement live third-party search/browser/image adapters as part of this feature; catalog Tool refs and stub/fixture execution outputs are sufficient for MVP acceptance when live adapters are absent.
- **FR-012**: Documentation (quickstart) MUST describe sample input, expected context keys, and how to verify step history for the seeded Workflow.
- **FR-013**: Designer/operator/viewer visibility and mutate rules for Workflow/Agent catalogs MUST remain unchanged from Platform Foundation (published-only for non-admin readers where already enforced).

### Key Entities

- **Trend Research Workflow**: Published Workflow configuration for kids-fashion trend research; identified by code `kids-fashion-trend-research`; definition holds three agent nodes and dependency edges.
- **Trend Research Execution**: One run of that Workflow; carries input brief and Shared Context culminating in `researchReport`.
- **Research Report**: Structured output artifact in context: summary, trends, references, gaps — handoff contract for later Fashion workflows.
- **Reference Item**: A collected inspiration/source pointer (title + URL or citation + optional notes) — textual for this feature; not an image asset pipeline.
- **Supporting Agents / Prompts / Tools**: Three dedicated Agents and three dedicated Prompts wired one-to-one; Tool refs (e.g. web search) on research-oriented Agents. Independent of any single Workflow instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seed, an authorized user can start Trend Research and reach a completed Execution with a usable `researchReport` in Shared Context in under 5 minutes in a guided smoke test (including any async wait).
- **SC-002**: 100% of unauthenticated start/read attempts on this Workflow’s Executions are denied; forbidden vs unauthenticated outcomes remain distinguishable.
- **SC-003**: In acceptance tests, every completed happy-path Execution includes non-empty `researchReport.summary` and list fields `trends`, `references`, and `gaps` (lists MAY be empty only for `gaps` if explicitly documented; default expectation: all four keys present, `summary` and at least one trend on the sample fixture path).
- **SC-004**: Re-running platform seed twice leaves exactly one active Workflow with code `kids-fashion-trend-research` and does not create duplicate active Agent/Prompt codes for the supporting catalog (including the three Fashion Agents and three Fashion Prompts).
- **SC-005**: A viewer can read a completed Execution’s status and step list but cannot start Trend Research in 100% of permission checks.
- **SC-006**: Quickstart sample input succeeds on first attempt without undocumented required fields for at least one smoke-test operator.

## Assumptions

- Platform Foundation is Done: Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library, and Execution Engine are available.
- This feature is **configuration and seed** (plus docs/tests) on existing modules — not a new NestJS domain module or Fashion microservice.
- Three logical steps map to **three dedicated published Agents** (one Agent code per node); exact Agent codes are chosen in planning (e.g. trend-research / reference-collector / research-report). Existing demo `research-agent` MAY remain for other samples but is not required to back all three Fashion nodes.
- Required Execution input fields for Trend Research (`season`, `category`, `market`) MUST be non-blank and MUST be declared as required keys on the Workflow definition; start is rejected otherwise (fail fast; no successful enqueue of a runnable Execution) — confirmed clarify 2026-07-15.
- Required-input enforcement at Execution start is **generic** (any Workflow may declare required input keys); it is not a special-case path only for this Fashion Workflow — confirmed clarify 2026-07-15.
- Exact storage location of “required input keys” inside `definition_json` (e.g. under `variables`, `policies`, or a dedicated field) is deferred to planning; behavior and product contract are fixed. Editing required keys uses existing definition update paths only (no new dedicated endpoints) — confirmed clarify 2026-07-15.
- Default sample input for quickstart: `season=SS27`, `category=kids-apparel`, `market=VN` (or `US` as alternate demo).
- Shared Context key names (`trendFindings`, `references`, `researchReport`) are the handoff contract for Reference Image Workflow later; image fetching is out of scope here.
- If the Agent runner still uses stubs/fixtures, fixtures MUST return JSON matching the report and intermediate shapes so P1 scenarios pass without live LLM or SerpAPI.
- Existing Tool codes such as `web-search` MAY be reused on research Agents; inventing live tool adapters is out of scope.
- Each of the three dedicated Agents MUST have its own dedicated published Prompt (`promptRef`); three distinct Prompt codes — confirmed clarify 2026-07-15. Existing `research-brief` MAY remain for non-Fashion demo Agents.
- Cancel/retry/history semantics are inherited from Execution; no Trend-Research-specific lifecycle states.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance comes from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Downstream Fashion workflows remain separate backlog items and MUST NOT be partially implemented here.
