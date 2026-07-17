# Feature Specification: Style Analysis Workflow

**Feature Branch**: `010-style-analysis`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Milestone 2 third feature — Kids Fashion Style Analysis Workflow. Deliver a published business Workflow on Platform Foundation (configuration/seed only, not a new domain NestJS module) that analyzes color, style, pattern, and illustration signals from Reference Image outputs and produces a structured style report in Shared Context. Reuse existing Workflow/Agent/Prompt/Tool/Execution capabilities. Out of scope: Design Brief and later Fashion workflows, live vision/CV adapters, binary asset analysis pipelines, new fashion-specific public APIs."

## Clarifications

### Session 2026-07-15

- Q: How should the four Style Analysis steps be connected in the Workflow graph? → A: Linear sequential — color → style → pattern → illustration/report (each step waits for the previous; no parallel fan-in).
- Q: What shape should `styleReport` list items use (`colors`, `styles`, `patterns`, `illustrationNotes`, `recommendations`)? → A: Structured objects with at least `label` + optional `notes` (not plain strings; not rich domain-specific fields in MVP).
- Q: Which step writes the handoff artifact `styleReport`? → A: Only the final illustration/report step writes `styleReport`; color/style/pattern write intermediate keys only.
- Q: What shape should intermediate analysis keys use? → A: Each of `colorAnalysis` / `styleAnalysis` / `patternAnalysis` is `{ summary, findings[] }` where `findings` items are `{ label, notes? }`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce a Style Report from Inspiration (Priority: P1)

A designer or operator with execute permission starts the published **Kids Fashion Style Analysis** Workflow with a kids-fashion brief (season, category, market) and optionally Reference Image outputs (`inspirationBoard`, `groupedReferences`, `imageCandidates`). The Workflow runs four logical steps in order: color analysis → style analysis → pattern analysis → illustration analysis (report synthesis). When Execution completes, the Shared Context contains a structured style report plus intermediate analysis keys that a human can review and that Design Brief can consume later.

**Why this priority**: This is the third Milestone 2 business outcome — without a runnable Style Analysis path, Design Brief and downstream design steps cannot start.

**Independent Test**: After platform seed, start Execution with sample kids-fashion input (injecting Reference Image–shaped context if desired); wait until status is completed; confirm context includes `styleReport` with summary, colors, styles, patterns, illustrationNotes, and recommendations; confirm four steps appear in history.

**Acceptance Scenarios**:

1. **Given** the published Workflow `kids-fashion-style-analysis` and a user with execute permission, **When** they start Execution with valid input (`season`, `category`, `market`), **Then** an Execution is created and progresses through color, style, pattern, and illustration analysis until `completed`.
2. **Given** a completed Execution, **When** they retrieve Execution detail and steps, **Then** each step shows status, and the final Shared Context includes `styleReport` with at least `summary`, `colors`, `styles`, `patterns`, `illustrationNotes`, and `recommendations`, where each list item is an object with a non-blank `label` and optional `notes`.
3. **Given** a completed Execution, **When** they inspect intermediate context, **Then** `colorAnalysis`, `styleAnalysis`, and `patternAnalysis` are each present as `{ summary, findings }` (findings items `{ label, notes? }`, written by the first three steps) and `styleReport` is present (written by the final step only) so later Design Brief work can consume them.
4. **Given** Execution input that also includes prior Reference Image keys (`inspirationBoard` and/or `groupedReferences` / `imageCandidates`), **When** the Workflow runs, **Then** analysis steps use those signals (not only season/category/market alone).
5. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start the Workflow, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** they attempt to start or read the Execution, **Then** access is denied as unauthenticated.
7. **Given** missing or blank `season`, `category`, or `market`, **When** a user with execute permission attempts to start Style Analysis, **Then** start is rejected with a clear validation error and no runnable Execution is successfully enqueued.
8. **Given** any other published Workflow whose definition declares required input keys, **When** start omits a declared required key, **Then** start is rejected the same way (generic enforcement already shipped; not Fashion-only).

---

### User Story 2 - Catalog Ready After Seed (Priority: P1)

An admin (or any authorized reader of published catalogs) finds, after a fresh or repeated platform seed, a published Workflow and supporting Agents/Prompts/Tools already wired so Style Analysis is executable without manual registry setup.

**Why this priority**: Configuration-driven delivery depends on idempotent seed; manual wiring is not acceptable for MVP demo path.

**Independent Test**: Run seed twice; list Workflows/Agents/Prompts; confirm `kids-fashion-style-analysis` is published with a non-empty graph; node Agents are published and enabled; Prompt and Tool references used by those Agents are valid published+enabled codes; no duplicate active codes.

**Acceptance Scenarios**:

1. **Given** an empty or existing database, **When** platform seed runs, **Then** Workflow `kids-fashion-style-analysis` exists as **published** with a non-empty definition (at least four agent nodes and required edges).
2. **Given** seeded Agents for the Workflow nodes, **When** an admin lists them, **Then** four distinct Agents exist (one per step), each published and enabled, with documented input/output expectations suitable for its step.
3. **Given** seeded Prompt and Tool assignments on those Agents, **When** assignment rules are evaluated, **Then** each of the four Agents has a distinct published enabled `promptRef`, and every `toolRefs` entry points to a published enabled catalog item.
4. **Given** seed has already been applied, **When** seed runs again, **Then** no duplicate active Workflow/Agent/Prompt codes are created and the Style Analysis catalog remains consistent (idempotent).

---

### User Story 3 - Browse and Understand the Workflow Before Running (Priority: P2)

A designer or operator with read permission opens the published Style Analysis Workflow, sees its definition (nodes, edges, mappings) and understands required Execution input fields from documentation/quickstart aligned with the Workflow, including how Reference Image outputs may be supplied.

**Why this priority**: Supports safe reuse and handoff; secondary to actually running and seeding.

**Independent Test**: As designer/operator, get published Workflow by code/id; confirm definition readable; follow quickstart sample input successfully (standalone or with injected Reference Image–shaped payload).

**Acceptance Scenarios**:

1. **Given** a user with Workflow read permission, **When** they retrieve `kids-fashion-style-analysis`, **Then** they see published metadata and the published definition graph, including declared required input keys.
2. **Given** the quickstart sample input, **When** they start Execution, **Then** the run succeeds without undocumented required fields.
3. **Given** a viewer (read-only), **When** they open the published Workflow and a completed Execution, **Then** they can read them but cannot mutate definition or start Execution.
4. **Given** a designer with Workflow update permission and a draft version, **When** they update the definition via existing definition update paths to change required input keys, **Then** subsequent starts enforce the updated keys (no new dedicated required-input API required).

---

### User Story 4 - Operational Control of a Failed or Running Run (Priority: P2)

An operator cancels an in-flight Style Analysis Execution or retries a failed one using existing Execution capabilities; no special Fashion-only cancel/retry rules are introduced.

**Why this priority**: Ops continuity uses Platform Execution already Done; validates this Workflow behaves like any other published Workflow.

**Independent Test**: Start Execution; cancel while running/pending → cancelled; force a failed path (if fixture supports) → retry → progressed or completed per Execution rules.

**Acceptance Scenarios**:

1. **Given** a Style Analysis Execution in `pending` or `running`, **When** an authorized user cancels it, **Then** status becomes `cancelled` and no further successful step completion is expected.
2. **Given** a Style Analysis Execution in `failed`, **When** an authorized user retries it, **Then** failed steps may be re-attempted without rewriting the Workflow definition.

---

### Edge Cases

- Missing required input fields (`season`, `category`, or `market`) or blank-only values → **start is rejected** with a clear validation error; a runnable Execution is **not** successfully enqueued (generic `policies.requiredInputs`).
- Prior Reference Image keys omitted → Execution still proceeds when required fields are present; agents/fixtures synthesize analysis from season/category/market alone.
- Empty or whitespace-only optional `inspirationBoard` / `groupedReferences` / `imageCandidates` → treated as omitted; Execution still proceeds when required fields are present.
- Workflow exists but an Agent referenced by a node is later disabled → new Executions MUST fail validation at start or at the step with a clear error; historical completed Executions remain readable.
- Soft-deleted Workflow code → not startable; after archive + code reuse, only the new active Workflow is startable.
- Concurrent Executions with different inputs → independent; Shared Context is per Execution.
- Stub/fixture agent runner (if live vision analysis unavailable) → still produces structured JSON matching the documented style report shape so P1 acceptance scenarios pass.
- Analysis operates on **metadata and structured references** (titles, URLs, groups, notes) — not binary image bytes stored or decoded by this Workflow.
- Extremely large input text → rejected or truncated per existing platform limits; no Fashion-specific size rules required beyond documenting platform defaults.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a published Workflow with stable code `kids-fashion-style-analysis` representing Kids Fashion Style Analysis.
- **FR-002**: The Workflow definition MUST include four **linear sequential** agent steps — (1) color analysis → (2) style analysis → (3) pattern analysis → (4) illustration analysis / style report synthesis — with edges forming a single chain (no parallel branches or fan-in). Each step MUST wait for its immediate predecessor to complete successfully before it can run. Each step MUST reference a **distinct** published Agent (four dedicated Agents total — not the same Agent code on multiple nodes).
- **FR-003**: System MUST accept Execution input that includes at least non-blank `season`, `category`, and `market` for Style Analysis; optional `inspirationBoard`, `groupedReferences`, `imageCandidates`, `ageBand`, and `constraints` MAY be provided. Required keys for this Workflow MUST be declared in the Workflow definition (configuration). If any declared required field is missing or blank, System MUST **reject start** with a clear validation error and MUST NOT successfully enqueue a runnable Execution.
- **FR-003b**: Required input keys MUST be stored as part of the Workflow definition configuration (reuse existing `policies.requiredInputs`). Platform seed MUST set the required keys for `kids-fashion-style-analysis`. Authorized users MAY change required keys only by updating the draft definition through existing definition update capabilities; this feature MUST NOT add new dedicated endpoints solely for editing required-input keys.
- **FR-004**: On successful completion, Shared Context MUST include `styleReport` with at least: `summary` (text), `colors` (list), `styles` (list), `patterns` (list), `illustrationNotes` (list), and `recommendations` (list). Each list item MUST be an object with a non-blank `label` (text) and optional `notes` (text). Intermediate keys `colorAnalysis`, `styleAnalysis`, and `patternAnalysis` MUST each be an object with `summary` (text) and `findings` (list of `{ label, notes? }`). **Only** the final illustration/report step MAY write `styleReport`; the color, style, and pattern steps MUST write their intermediate keys only and MUST NOT write `styleReport`.
- **FR-005**: System MUST seed Workflow, Agents, Prompts, and Tool assignments required for this Workflow as part of the platform seed flow; seed MUST be idempotent and MUST NOT invent a separate Fashion REST module.
- **FR-006**: Each Workflow node MUST reference a published, enabled Agent; Agents MUST expose input/output expectations consistent with their step (schemas or documented contracts).
- **FR-007**: Each of the four Style Analysis Agents MUST reference its own dedicated published enabled Prompt via `promptRef` (four distinct Prompt codes). Analysis Agent(s) that benefit from browsing reference URLs MAY also reference at least one published enabled catalog Tool via `toolRefs` (default: existing web browser and/or web search catalog entries).
- **FR-008**: Users MUST start, observe, cancel, and retry Style Analysis Executions using the existing Execution capabilities and permissions (`workflows:execute` / `executions:*`); this feature MUST NOT add new permission codes.
- **FR-009**: System MUST NOT require new public Fashion-specific API routes; all management and execution uses existing Workflow, Agent, Prompt, Tool, and Execution surfaces.
- **FR-010**: System MUST NOT implement Design Brief, Image Generation, or Design Review workflows in this feature; System MUST NOT modify Reference Image AC beyond consuming its documented handoff keys.
- **FR-011**: System MUST NOT implement live third-party vision/CV adapters, scrapers, or binary image analysis pipelines as part of this feature; catalog Tool refs and stub/fixture execution outputs are sufficient for MVP acceptance when live adapters are absent.
- **FR-012**: Documentation (quickstart) MUST describe sample input (including optional Reference Image–shaped payload), expected context keys, and how to verify step history for the seeded Workflow.
- **FR-013**: Designer/operator/viewer visibility and mutate rules for Workflow/Agent catalogs MUST remain unchanged from Platform Foundation (published-only for non-admin readers where already enforced).

### Key Entities

- **Style Analysis Workflow**: Published Workflow configuration for kids-fashion visual/style analysis; identified by code `kids-fashion-style-analysis`; definition holds four agent nodes in a **linear sequential chain** (color → style → pattern → illustration/report).
- **Style Analysis Execution**: One run of that Workflow; carries input brief (and optional Reference Image outputs) and Shared Context culminating in `styleReport`.
- **Style Report**: Structured output artifact in context: summary plus lists `colors`, `styles`, `patterns`, `illustrationNotes`, `recommendations` — each list item is `{ label, notes? }` — handoff contract for Design Brief Workflow.
- **Analysis Intermediate**: Per-step structured findings written by the color, style, and pattern steps only — each of `colorAnalysis`, `styleAnalysis`, `patternAnalysis` is `{ summary, findings[] }` with findings items `{ label, notes? }` — metadata for this feature; not a binary vision pipeline; these steps do not write `styleReport`.
- **Supporting Agents / Prompts / Tools**: Four dedicated Agents and four dedicated Prompts wired one-to-one; optional Tool refs on browse-oriented Agents. Independent of any single Workflow instance. The illustration/report Agent is the sole producer of `styleReport`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seed, an authorized user can start Style Analysis and reach a completed Execution with a usable `styleReport` in Shared Context in under 5 minutes in a guided smoke test (including any async wait).
- **SC-002**: 100% of unauthenticated start/read attempts on this Workflow’s Executions are denied; forbidden vs unauthenticated outcomes remain distinguishable.
- **SC-003**: In acceptance tests, every completed happy-path Execution includes non-empty `styleReport.summary` and list fields `colors`, `styles`, `patterns`, `illustrationNotes`, and `recommendations` whose items are objects with non-blank `label` (and optional `notes`). Lists MAY be empty only for `illustrationNotes` or `recommendations` if explicitly documented; default expectation: all six keys present, `summary` and at least one labeled item in `colors` and `styles` on the sample fixture path.
- **SC-004**: Re-running platform seed twice leaves exactly one active Workflow with code `kids-fashion-style-analysis` and does not create duplicate active Agent/Prompt codes for the supporting catalog (including the four Style Analysis Agents and four Style Analysis Prompts).
- **SC-005**: A viewer can read a completed Execution’s status and step list but cannot start Style Analysis in 100% of permission checks.
- **SC-006**: Quickstart sample input succeeds on first attempt without undocumented required fields for at least one smoke-test operator.

## Assumptions

- Platform Foundation and Reference Image Workflow are Done: Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library, Execution Engine, and generic `policies.requiredInputs` enforcement are available.
- This feature is **configuration and seed** (plus docs/tests) on existing modules — not a new NestJS domain module or Fashion microservice.
- Four logical steps map to **four dedicated published Agents** (one Agent code per node) connected in a **linear sequential chain** (no parallel branches); exact Agent codes are chosen in planning (e.g. fashion-color-analyzer / fashion-style-analyzer / fashion-pattern-analyzer / fashion-illustration-analyzer).
- Required Execution input fields (`season`, `category`, `market`) MUST be non-blank and MUST be declared as required keys on the Workflow definition; start is rejected otherwise.
- Style Analysis MAY run **standalone** (no prior Execution required): optional Reference Image keys enrich the run when supplied in Execution input; they are not mandatory for start.
- Default sample input for quickstart: `season=SS27`, `category=kids-apparel`, `market=VN`, optionally with a minimal injected `inspirationBoard` / `groupedReferences` matching Reference Image handoff shape.
- Shared Context key names (`colorAnalysis`, `styleAnalysis`, `patternAnalysis`, `styleReport`) are the handoff contract for Design Brief Workflow later; intermediates use `{ summary, findings[{ label, notes? }] }`; `styleReport` list items use `{ label, notes? }` and are produced only by the final illustration/report step.
- If the Agent runner still uses stubs/fixtures, fixtures MUST return JSON matching the style report and intermediate shapes so P1 scenarios pass without live vision analysis.
- Existing Tool codes such as `web-search` / `web-browser` MAY be reused; inventing live vision tool adapters is out of scope.
- Each of the four dedicated Agents MUST have its own dedicated published Prompt (`promptRef`); four distinct Prompt codes.
- Cancel/retry/history semantics are inherited from Execution; no Style-Analysis-specific lifecycle states.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance comes from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Downstream Fashion workflows (Design Brief and later) remain separate backlog items and MUST NOT be partially implemented here.
