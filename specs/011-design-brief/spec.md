# Feature Specification: Design Brief Workflow

**Feature Branch**: `011-design-brief`

**Created**: 2026-07-15

**Status**: Implemented

**Input**: User description: "Milestone 2 fourth feature — Kids Fashion Design Brief Workflow. Deliver a published business Workflow on Platform Foundation (configuration/seed only, not a new domain NestJS module) that generates a design brief and a design specification from Style Analysis outputs and produces structured artifacts in Shared Context for Image Generation handoff. Reuse existing Workflow/Agent/Prompt/Tool/Execution capabilities. Out of scope: Image Generation and Design Review workflows, live LLM/image adapters, new fashion-specific public APIs."

## Clarifications

### Session 2026-07-15

- Q: What is the required Shared Context handoff for Image Generation? → A: Both `designBrief` and `designSpecification` are required handoff keys for Image Generation.
- Q: What shape should `designBrief` use? → A: `summary` + `themes` / `mustHaves` / `avoid` only (no extra free-text narrative field).
- Q: Should Design Brief Agents require Tool catalog refs? → A: Neither Agent requires `toolRefs` (`[]` OK); optional later.
- Q: Must the specification step consume `designBrief` from Shared Context? → A: Specification step MUST map `designBrief` from Shared Context as an input.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce a Design Brief and Specification from Style Analysis (Priority: P1)

A designer or operator with execute permission starts the published **Kids Fashion Design Brief** Workflow with a kids-fashion brief (season, category, market) and optionally Style Analysis outputs (`styleReport`, `colorAnalysis`, `styleAnalysis`, `patternAnalysis`). The Workflow runs two logical steps in order: generate design brief → generate design specification. When Execution completes, the Shared Context contains a design brief and a design specification that a human can review and that Image Generation can consume later.

**Why this priority**: This is the fourth Milestone 2 business outcome — without a runnable Design Brief path, Image Generation and Design Review cannot start.

**Independent Test**: After platform seed, start Execution with sample kids-fashion input (injecting Style Analysis–shaped context if desired); wait until status is completed; confirm context includes `designBrief` and `designSpecification` with documented fields; confirm two steps appear in history.

**Acceptance Scenarios**:

1. **Given** the published Workflow `kids-fashion-design-brief` and a user with execute permission, **When** they start Execution with valid input (`season`, `category`, `market`), **Then** an Execution is created and progresses through design brief generation then design specification until `completed`, and the specification step receives `designBrief` from Shared Context via input mapping.
2. **Given** a completed Execution, **When** they retrieve Execution detail and steps, **Then** each step shows status, and the final Shared Context includes both `designBrief` and `designSpecification` with at least the documented required fields (summary plus structured list fields whose items are objects with a non-blank `label` and optional `notes`).
3. **Given** a completed Execution, **When** they inspect context keys, **Then** `designBrief` is present (written by the brief step only) and `designSpecification` is present (written by the specification step only); **both** keys are the required Image Generation handoff contract (neither alone is sufficient).
4. **Given** Execution input that also includes prior Style Analysis keys (`styleReport` and/or `colorAnalysis` / `styleAnalysis` / `patternAnalysis`), **When** the Workflow runs, **Then** brief and specification steps use those signals (not only season/category/market alone).
5. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start the Workflow, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** they attempt to start or read the Execution, **Then** access is denied as unauthenticated.
7. **Given** missing or blank `season`, `category`, or `market`, **When** a user with execute permission attempts to start Design Brief, **Then** start is rejected with a clear validation error and no runnable Execution is successfully enqueued.
8. **Given** any other published Workflow whose definition declares required input keys, **When** start omits a declared required key, **Then** start is rejected the same way (generic enforcement already shipped; not Fashion-only).

---

### User Story 2 - Catalog Ready After Seed (Priority: P1)

An admin (or any authorized reader of published catalogs) finds, after a fresh or repeated platform seed, a published Workflow and supporting Agents/Prompts/Tools already wired so Design Brief is executable without manual registry setup.

**Why this priority**: Configuration-driven delivery depends on idempotent seed; manual wiring is not acceptable for MVP demo path.

**Independent Test**: Run seed twice; list Workflows/Agents/Prompts; confirm `kids-fashion-design-brief` is published with a non-empty graph; node Agents are published and enabled; Prompt and Tool references used by those Agents are valid published+enabled codes; no duplicate active codes.

**Acceptance Scenarios**:

1. **Given** an empty or existing database, **When** platform seed runs, **Then** Workflow `kids-fashion-design-brief` exists as **published** with a non-empty definition (at least two agent nodes and required edges).
2. **Given** seeded Agents for the Workflow nodes, **When** an admin lists them, **Then** two distinct Agents exist (one per step), each published and enabled, with documented input/output expectations suitable for its step.
3. **Given** seeded Prompt assignments on those Agents, **When** assignment rules are evaluated, **Then** each of the two Agents has a distinct published enabled `promptRef`, and `toolRefs` MAY be empty (`[]`); if any `toolRefs` are present, every entry MUST point to a published enabled catalog item.
4. **Given** seed has already been applied, **When** seed runs again, **Then** no duplicate active Workflow/Agent/Prompt codes are created and the Design Brief catalog remains consistent (idempotent).

---

### User Story 3 - Browse and Understand the Workflow Before Running (Priority: P2)

A designer or operator with read permission opens the published Design Brief Workflow, sees its definition (nodes, edges, mappings) and understands required Execution input fields from documentation/quickstart aligned with the Workflow, including how Style Analysis outputs may be supplied.

**Why this priority**: Supports safe reuse and handoff; secondary to actually running and seeding.

**Independent Test**: As designer/operator, get published Workflow by code/id; confirm definition readable; follow quickstart sample input successfully (standalone or with injected Style Analysis–shaped payload).

**Acceptance Scenarios**:

1. **Given** a user with Workflow read permission, **When** they retrieve `kids-fashion-design-brief`, **Then** they see published metadata and the published definition graph, including declared required input keys.
2. **Given** the quickstart sample input, **When** they start Execution, **Then** the run succeeds without undocumented required fields.
3. **Given** a viewer (read-only), **When** they open the published Workflow and a completed Execution, **Then** they can read them but cannot mutate definition or start Execution.
4. **Given** a designer with Workflow update permission and a draft version, **When** they update the definition via existing definition update paths to change required input keys, **Then** subsequent starts enforce the updated keys (no new dedicated required-input API required).

---

### User Story 4 - Operational Control of a Failed or Running Run (Priority: P2)

An operator cancels an in-flight Design Brief Execution or retries a failed one using existing Execution capabilities; no special Fashion-only cancel/retry rules are introduced.

**Why this priority**: Ops continuity uses Platform Execution already Done; validates this Workflow behaves like any other published Workflow.

**Independent Test**: Start Execution; cancel while running/pending → cancelled; force a failed path (if fixture supports) → retry → progressed or completed per Execution rules.

**Acceptance Scenarios**:

1. **Given** a Design Brief Execution in `pending` or `running`, **When** an authorized user cancels it, **Then** status becomes `cancelled` and no further successful step completion is expected.
2. **Given** a Design Brief Execution in `failed`, **When** an authorized user retries it, **Then** failed steps may be re-attempted without rewriting the Workflow definition.

---

### Edge Cases

- Missing required input fields (`season`, `category`, or `market`) or blank-only values → **start is rejected** with a clear validation error; a runnable Execution is **not** successfully enqueued (generic `policies.requiredInputs`).
- Prior Style Analysis keys omitted → Execution still proceeds when required fields are present; agents/fixtures synthesize brief and specification from season/category/market alone.
- Empty or whitespace-only optional `styleReport` / `colorAnalysis` / `styleAnalysis` / `patternAnalysis` → treated as omitted; Execution still proceeds when required fields are present.
- Workflow exists but an Agent referenced by a node is later disabled → new Executions MUST fail validation at start or at the step with a clear error; historical completed Executions remain readable.
- Soft-deleted Workflow code → not startable; after archive + code reuse, only the new active Workflow is startable.
- Concurrent Executions with different inputs → independent; Shared Context is per Execution.
- Stub/fixture agent runner (if live LLM unavailable) → still produces structured JSON matching the documented brief and specification shapes so P1 acceptance scenarios pass.
- Extremely large input text → rejected or truncated per existing platform limits; no Fashion-specific size rules required beyond documenting platform defaults.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a published Workflow with stable code `kids-fashion-design-brief` representing Kids Fashion Design Brief.
- **FR-002**: The Workflow definition MUST include two **linear sequential** agent steps — (1) design brief generation → (2) design specification generation — with edges forming a single chain (no parallel branches). Each step MUST wait for its immediate predecessor to complete successfully before it can run. Each step MUST reference a **distinct** published Agent (two dedicated Agents total — not the same Agent code on multiple nodes). The specification step’s input mapping MUST include `designBrief` from Shared Context (produced by the brief step); the specification step MUST NOT run solely on season/category/market or Style Analysis keys while ignoring `designBrief`.
- **FR-003**: System MUST accept Execution input that includes at least non-blank `season`, `category`, and `market` for Design Brief; optional `styleReport`, `colorAnalysis`, `styleAnalysis`, `patternAnalysis`, `ageBand`, and `constraints` MAY be provided. Required keys for this Workflow MUST be declared in the Workflow definition (configuration). If any declared required field is missing or blank, System MUST **reject start** with a clear validation error and MUST NOT successfully enqueue a runnable Execution.
- **FR-003b**: Required input keys MUST be stored as part of the Workflow definition configuration (reuse existing `policies.requiredInputs`). Platform seed MUST set the required keys for `kids-fashion-design-brief`. Authorized users MAY change required keys only by updating the draft definition through existing definition update capabilities; this feature MUST NOT add new dedicated endpoints solely for editing required-input keys.
- **FR-004**: On successful completion, Shared Context MUST include `designBrief` with exactly these top-level content fields for MVP: `summary` (text), `themes` (list), `mustHaves` (list), and `avoid` (list) — **no** additional free-text narrative field (e.g. no `creativeDirection` / `body`). Shared Context MUST also include `designSpecification` with at least: `summary` (text), `objectives` (list), `constraints` (list), `colorDirection` (list), `styleDirection` (list), `patternDirection` (list), and `deliverables` (list). Each list item MUST be an object with a non-blank `label` (text) and optional `notes` (text). **Only** the brief step MAY write `designBrief`; **only** the specification step MAY write `designSpecification`. Downstream **Image Generation** MUST treat **both** `designBrief` and `designSpecification` as required handoff keys (neither alone is the full contract).
- **FR-005**: System MUST seed Workflow, Agents, Prompts, and Tool assignments required for this Workflow as part of the platform seed flow; seed MUST be idempotent and MUST NOT invent a separate Fashion REST module.
- **FR-006**: Each Workflow node MUST reference a published, enabled Agent; Agents MUST expose input/output expectations consistent with their step (schemas or documented contracts).
- **FR-007**: Each of the two Design Brief Agents MUST reference its own dedicated published enabled Prompt via `promptRef` (two distinct Prompt codes). MVP seed MUST leave `toolRefs` empty (`[]`) on both Agents; Tools are not required. If Tools are assigned later, every `toolRefs` entry MUST point to a published enabled catalog item. Inventing new live adapters is out of scope.
- **FR-008**: Users MUST start, observe, cancel, and retry Design Brief Executions using the existing Execution capabilities and permissions (`workflows:execute` / `executions:*`); this feature MUST NOT add new permission codes.
- **FR-009**: System MUST NOT require new public Fashion-specific API routes; all management and execution uses existing Workflow, Agent, Prompt, Tool, and Execution surfaces.
- **FR-010**: System MUST NOT implement Image Generation or Design Review workflows in this feature; System MUST NOT modify Style Analysis AC beyond consuming its documented handoff keys.
- **FR-011**: System MUST NOT implement live third-party LLM or image-generation adapters as part of this feature; catalog Tool refs and stub/fixture execution outputs are sufficient for MVP acceptance when live adapters are absent.
- **FR-012**: Documentation (quickstart) MUST describe sample input (including optional Style Analysis–shaped payload), expected context keys, and how to verify step history for the seeded Workflow.
- **FR-013**: Designer/operator/viewer visibility and mutate rules for Workflow/Agent catalogs MUST remain unchanged from Platform Foundation (published-only for non-admin readers where already enforced).

### Key Entities

- **Design Brief Workflow**: Published Workflow configuration for kids-fashion design brief and specification; identified by code `kids-fashion-design-brief`; definition holds two agent nodes in a **linear sequential chain** (brief → specification) where the specification node maps `designBrief` from Shared Context as an input.
- **Design Brief Execution**: One run of that Workflow; carries input brief (and optional Style Analysis outputs) and Shared Context culminating in `designBrief` + `designSpecification`.
- **Design Brief**: Structured creative artifact in context: `summary` plus lists `themes`, `mustHaves`, `avoid` — each list item is `{ label, notes? }` — written only by the brief step; required Image Generation handoff key (with Design Specification).
- **Design Specification**: Structured specification artifact in context: `summary` plus lists `objectives`, `constraints`, `colorDirection`, `styleDirection`, `patternDirection`, `deliverables` — each list item is `{ label, notes? }` — written only by the specification step; required Image Generation handoff key (with Design Brief).
- **Supporting Agents / Prompts / Tools**: Two dedicated Agents and two dedicated Prompts wired one-to-one; MVP seed uses empty `toolRefs` on both Agents. Independent of any single Workflow instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seed, an authorized user can start Design Brief and reach a completed Execution with usable `designBrief` and `designSpecification` in Shared Context in under 5 minutes in a guided smoke test (including any async wait).
- **SC-002**: 100% of unauthenticated start/read attempts on this Workflow’s Executions are denied; forbidden vs unauthenticated outcomes remain distinguishable.
- **SC-003**: In acceptance tests, every completed happy-path Execution includes non-empty `designBrief.summary` and `designSpecification.summary`, with list fields present as objects with non-blank `label` (and optional `notes`). Default fixture expectation: at least one labeled item in `designBrief.themes` and in `designSpecification.objectives` and `designSpecification.deliverables`.
- **SC-004**: Re-running platform seed twice leaves exactly one active Workflow with code `kids-fashion-design-brief` and does not create duplicate active Agent/Prompt codes for the supporting catalog (including the two Design Brief Agents and two Design Brief Prompts).
- **SC-005**: A viewer can read a completed Execution’s status and step list but cannot start Design Brief in 100% of permission checks.
- **SC-006**: Quickstart sample input succeeds on first attempt without undocumented required fields for at least one smoke-test operator.

## Assumptions

- Platform Foundation and Style Analysis Workflow are Done: Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library, Execution Engine, and generic `policies.requiredInputs` enforcement are available.
- This feature is **configuration and seed** (plus docs/tests) on existing modules — not a new NestJS domain module or Fashion microservice.
- Two logical steps map to **two dedicated published Agents** (one Agent code per node) connected in a **linear sequential chain** (no parallel branches); the specification node MUST map `designBrief` as an input. Exact Agent codes are chosen in planning (e.g. `fashion-design-brief-writer` / `fashion-design-spec-writer`).
- Required Execution input fields (`season`, `category`, `market`) MUST be non-blank and MUST be declared as required keys on the Workflow definition; start is rejected otherwise.
- Design Brief MAY run **standalone** (no prior Execution required): optional Style Analysis keys enrich the run when supplied in Execution input; they are not mandatory for start.
- Default sample input for quickstart: `season=SS27`, `category=kids-apparel`, `market=VN`, optionally with a minimal injected `styleReport` matching Style Analysis handoff shape.
- Shared Context key names (`designBrief`, `designSpecification`) are **both** required handoff keys for Image Generation Workflow later; list items use `{ label, notes? }`; each artifact is written only by its owning step.
- If the Agent runner still uses stubs/fixtures, fixtures MUST return JSON matching the brief and specification shapes so P1 scenarios pass without live LLM.
- MVP seed leaves Design Brief Agent `toolRefs` empty; inventing live generation adapters is out of scope.
- Each of the two dedicated Agents MUST have its own dedicated published Prompt (`promptRef`); two distinct Prompt codes.
- Cancel/retry/history semantics are inherited from Execution; no Design-Brief-specific lifecycle states.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance comes from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Downstream Fashion workflows (Image Generation and Design Review) remain separate backlog items and MUST NOT be partially implemented here.
