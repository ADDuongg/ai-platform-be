# Feature Specification: Image Generation Workflow

**Feature Branch**: `012-image-generation`

**Created**: 2026-07-15

**Status**: Implemented

**Input**: User description: "Milestone 2 fifth feature — Kids Fashion Image Generation Workflow. Deliver a published business Workflow on Platform Foundation (configuration/seed only, not a new domain NestJS module) that prepares generation prompts from Design Brief outputs, produces multiple artwork variations, and organizes generated image candidates in Shared Context for Design Review handoff. Reuse existing Workflow/Agent/Prompt/Tool/Execution capabilities. Out of scope: Design Review workflow, live image-provider adapters, new fashion-specific public APIs."

## Clarifications

### Session 2026-07-15

- Q: What Shared Context key / shape should the generate step write for the organize step to consume? → A: Generate writes `rawGenerations` (array of variation drafts); organize alone writes `generatedImages`.
- Q: What shape should intermediate `imageGenPrompts` use? → A: Object with `summary` + `prompts[]` of `{ id, label, text }` (text = full prompt string).
- Q: Must each variation’s optional `promptRef` link back to an `imageGenPrompts.prompts[].id`? → A: Optional — `promptRef` MAY be set; when present it SHOULD match a prep prompt `id`, but missing `promptRef` is allowed.
- Q: Must the organize Agent seed include Tool `object-storage` in `toolRefs`? → A: Required — organize Agent MUST include `object-storage` in `toolRefs`.
- Q: How many variations should the happy-path stub/demo fixtures produce by default? → A: Exactly **2** variations (and 2 prep prompts) in default fixtures.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce Artwork Variations from Design Brief (Priority: P1)

A designer or operator with execute permission starts the published **Kids Fashion Image Generation** Workflow with a kids-fashion brief (season, category, market) and Design Brief handoff keys (`designBrief`, `designSpecification`). The Workflow runs three logical steps in order: prepare generation prompts → generate artwork variations → organize generation outputs. When Execution completes, the Shared Context contains structured generated image candidates that a human can review and that Design Review can consume later.

**Why this priority**: This is the fifth Milestone 2 business outcome — without a runnable Image Generation path, Design Review cannot start and the Kids Fashion pipeline cannot produce visual concepts.

**Independent Test**: After platform seed, start Execution with sample kids-fashion input (injecting Design Brief–shaped context); wait until status is completed; confirm context includes `generatedImages` with exactly two default-fixture variations (and matching intermediates); confirm three steps appear in history.

**Acceptance Scenarios**:

1. **Given** the published Workflow `kids-fashion-image-generation` and a user with execute permission, **When** they start Execution with valid input (`season`, `category`, `market`, `designBrief`, `designSpecification`), **Then** an Execution is created and progresses through prompt preparation, variation generation, then output organization until `completed`, and each later step receives required predecessor outputs from Shared Context via input mapping.
2. **Given** a completed Execution, **When** they retrieve Execution detail and steps, **Then** each step shows status, and the final Shared Context includes `generatedImages` with a summary and a `variations` list of at least two candidates, each with a non-blank `id` and `label` (and optional `promptRef`, `assetUrl`, `notes`); if `promptRef` is present it SHOULD match a prep prompt `id`, but variations without `promptRef` are still valid.
3. **Given** a completed Execution, **When** they inspect context keys, **Then** `imageGenPrompts` is present (written by the prep step only — `summary` + `prompts[]` of `{ id, label, text }` with exactly 2 prompts in default fixtures), `rawGenerations` is present (written by the generate step only — exactly 2 variation drafts in default fixtures), and `generatedImages` is present (written by the organize step only, with exactly 2 variations in default fixtures); **`generatedImages`** is the required Design Review handoff contract.
4. **Given** Execution input that includes Design Brief keys matching the documented handoff shapes, **When** the Workflow runs, **Then** prep and generation steps use those signals (not only season/category/market alone).
5. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start the Workflow, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** they attempt to start or read the Execution, **Then** access is denied as unauthenticated.
7. **Given** missing or blank `season`, `category`, `market`, `designBrief`, or `designSpecification`, **When** a user with execute permission attempts to start Image Generation, **Then** start is rejected with a clear validation error and no runnable Execution is successfully enqueued.
8. **Given** any other published Workflow whose definition declares required input keys, **When** start omits a declared required key, **Then** start is rejected the same way (generic enforcement already shipped; not Fashion-only).

---

### User Story 2 - Catalog Ready After Seed (Priority: P1)

An admin (or any authorized reader of published catalogs) finds, after a fresh or repeated platform seed, a published Workflow and supporting Agents/Prompts/Tools already wired so Image Generation is executable without manual registry setup.

**Why this priority**: Configuration-driven delivery depends on idempotent seed; manual wiring is not acceptable for MVP demo path.

**Independent Test**: Run seed twice; list Workflows/Agents/Prompts/Tools; confirm `kids-fashion-image-generation` is published with a non-empty graph; node Agents are published and enabled; Prompt and Tool references used by those Agents are valid published+enabled codes; no duplicate active codes.

**Acceptance Scenarios**:

1. **Given** an empty or existing database, **When** platform seed runs, **Then** Workflow `kids-fashion-image-generation` exists as **published** with a non-empty definition (at least three agent nodes and required edges).
2. **Given** seeded Agents for the Workflow nodes, **When** an admin lists them, **Then** three distinct Agents exist (one per step), each published and enabled, with documented input/output expectations suitable for its step.
3. **Given** seeded Prompt and Tool assignments on those Agents, **When** assignment rules are evaluated, **Then** each of the three Agents has a distinct published enabled `promptRef`; the generation Agent MUST reference the published `image-generation` Tool; the organize Agent MUST reference the published `object-storage` Tool; the prep Agent MAY leave `toolRefs` empty; every `toolRefs` entry MUST point to a published enabled catalog item.
4. **Given** seed has already been applied, **When** seed runs again, **Then** no duplicate active Workflow/Agent/Prompt codes are created and the Image Generation catalog remains consistent (idempotent).

---

### User Story 3 - Browse and Understand the Workflow Before Running (Priority: P2)

A designer or operator with read permission opens the published Image Generation Workflow, sees its definition (nodes, edges, mappings) and understands required Execution input fields from documentation/quickstart aligned with the Workflow, including how Design Brief outputs must be supplied.

**Why this priority**: Supports safe reuse and handoff; secondary to actually running and seeding.

**Independent Test**: As designer/operator, get published Workflow by code/id; confirm definition readable; follow quickstart sample input successfully (standalone with injected Design Brief–shaped payload).

**Acceptance Scenarios**:

1. **Given** a user with Workflow read permission, **When** they retrieve `kids-fashion-image-generation`, **Then** they see published metadata and the published definition graph, including declared required input keys.
2. **Given** the quickstart sample input, **When** they start Execution, **Then** the run succeeds without undocumented required fields.
3. **Given** a viewer (read-only), **When** they open the published Workflow and a completed Execution, **Then** they can read them but cannot mutate definition or start Execution.
4. **Given** a designer with Workflow update permission and a draft version, **When** they update the definition via existing definition update paths to change required input keys, **Then** subsequent starts enforce the updated keys (no new dedicated required-input API required).

---

### User Story 4 - Operational Control of a Failed or Running Run (Priority: P2)

An operator cancels an in-flight Image Generation Execution or retries a failed one using existing Execution capabilities; no special Fashion-only cancel/retry rules are introduced.

**Why this priority**: Ops continuity uses Platform Execution already Done; validates this Workflow behaves like any other published Workflow.

**Independent Test**: Start Execution; cancel while running/pending → cancelled; force a failed path (if fixture supports) → retry → progressed or completed per Execution rules.

**Acceptance Scenarios**:

1. **Given** an Image Generation Execution in `pending` or `running`, **When** an authorized user cancels it, **Then** status becomes `cancelled` and no further successful step completion is expected.
2. **Given** an Image Generation Execution in `failed`, **When** an authorized user retries it, **Then** failed steps may be re-attempted without rewriting the Workflow definition.

---

### Edge Cases

- Missing required input fields (`season`, `category`, `market`, `designBrief`, or `designSpecification`) or blank-only values → **start is rejected** with a clear validation error; a runnable Execution is **not** successfully enqueued (generic `policies.requiredInputs`).
- Malformed `designBrief` / `designSpecification` (missing expected top-level fields) → start may still succeed if presence checks only require non-blank objects/keys as declared; stub/fixtures MUST still produce valid generation outputs; clarify may tighten schema validation later without changing this feature’s MVP.
- Empty `rawGenerations` or empty final `variations` after a happy-path fixture → **not allowed**; default fixtures MUST produce exactly two prep prompts, two raw drafts, and two final variations so P1 scenarios pass.
- Workflow exists but an Agent referenced by a node is later disabled → new Executions MUST fail validation at start or at the step with a clear error; historical completed Executions remain readable.
- Soft-deleted Workflow code → not startable; after archive + code reuse, only the new active Workflow is startable.
- Concurrent Executions with different inputs → independent; Shared Context is per Execution.
- Stub/fixture agent runner (if live image provider unavailable) → still produces structured JSON matching the documented `imageGenPrompts`, `rawGenerations`, and `generatedImages` shapes so P1 acceptance scenarios pass (stub asset URLs/metadata are sufficient; no binary files required).
- Extremely large input text → rejected or truncated per existing platform limits; no Fashion-specific size rules required beyond documenting platform defaults.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a published Workflow with stable code `kids-fashion-image-generation` representing Kids Fashion Image Generation.
- **FR-002**: The Workflow definition MUST include three **linear sequential** agent steps — (1) prepare generation prompts → (2) generate artwork variations → (3) organize generation outputs — with edges forming a single chain (no parallel branches). Each step MUST wait for its immediate predecessor to complete successfully before it can run. Each step MUST reference a **distinct** published Agent (three dedicated Agents total — not the same Agent code on multiple nodes). The generation step’s input mapping MUST include `imageGenPrompts` from Shared Context; the organize step’s input mapping MUST include `rawGenerations` from Shared Context. The organize step MUST NOT run solely on prep outputs while ignoring `rawGenerations`.
- **FR-003**: System MUST accept Execution input that includes at least non-blank `season`, `category`, `market`, `designBrief`, and `designSpecification` for Image Generation; optional `ageBand` and `constraints` MAY be provided. Required keys for this Workflow MUST be declared in the Workflow definition (configuration). If any declared required field is missing or blank, System MUST **reject start** with a clear validation error and MUST NOT successfully enqueue a runnable Execution.
- **FR-003b**: Required input keys MUST be stored as part of the Workflow definition configuration (reuse existing `policies.requiredInputs`). Platform seed MUST set the required keys for `kids-fashion-image-generation`. Authorized users MAY change required keys only by updating the draft definition through existing definition update capabilities; this feature MUST NOT add new dedicated endpoints solely for editing required-input keys.
- **FR-004**: On successful completion, Shared Context MUST include intermediate `imageGenPrompts` (written by the prep step only) with exactly these top-level fields: `summary` (text) and `prompts` (list). Each prompt item MUST have a non-blank `id` (text), `label` (text), and `text` (full prompt string). Shared Context MUST also include intermediate `rawGenerations` (written by the generate step only — an array of variation drafts) and final `generatedImages` with at least: `summary` (text) and `variations` (list). Each raw generation draft and each final variation MUST have a non-blank `id` (text) and `label` (text), and MAY include `promptRef` (text), `assetUrl` (text), and `notes` (text). `promptRef` is **optional**; when present it SHOULD equal an `imageGenPrompts.prompts[].id`, but a variation without `promptRef` remains valid. Default stub/demo fixtures MUST produce **exactly 2** prep prompts, **exactly 2** raw generation drafts, and **exactly 2** final variations (AC floor remains ≥2 for non-fixture runs). **Only** the prep step MAY write `imageGenPrompts`; **Only** the generate step MAY write `rawGenerations`; **Only** the organize step MAY write `generatedImages`. Downstream **Design Review** MUST treat **`generatedImages`** as the required handoff key.
- **FR-005**: System MUST seed Workflow, Agents, Prompts, and Tool assignments required for this Workflow as part of the platform seed flow; seed MUST be idempotent and MUST NOT invent a separate Fashion REST module.
- **FR-006**: Each Workflow node MUST reference a published, enabled Agent; Agents MUST expose input/output expectations consistent with their step (schemas or documented contracts).
- **FR-007**: Each of the three Image Generation Agents MUST reference its own dedicated published enabled Prompt via `promptRef` (three distinct Prompt codes). The generation Agent MUST include published enabled Tool code `image-generation` in `toolRefs`. The organize Agent MUST include published enabled Tool code `object-storage` in `toolRefs`. The prep Agent MAY leave `toolRefs` empty (`[]`). Every `toolRefs` entry MUST point to a published enabled catalog item. Inventing new live image-provider or storage adapters is out of scope.
- **FR-008**: Users MUST start, observe, cancel, and retry Image Generation Executions using the existing Execution capabilities and permissions (`workflows:execute` / `executions:*`); this feature MUST NOT add new permission codes.
- **FR-009**: System MUST NOT require new public Fashion-specific API routes; all management and execution uses existing Workflow, Agent, Prompt, Tool, and Execution surfaces.
- **FR-010**: System MUST NOT implement Design Review workflow in this feature; System MUST NOT modify Design Brief AC beyond consuming its documented handoff keys (`designBrief`, `designSpecification`).
- **FR-011**: System MUST NOT implement live third-party image-generation adapters as part of this feature; catalog Tool refs and stub/fixture execution outputs (including stub `assetUrl` values) are sufficient for MVP acceptance when live adapters are absent.
- **FR-012**: Documentation (quickstart) MUST describe sample input (including Design Brief–shaped payload), expected context keys, variation count expectation (≥2), and how to verify step history for the seeded Workflow.
- **FR-013**: Designer/operator/viewer visibility and mutate rules for Workflow/Agent catalogs MUST remain unchanged from Platform Foundation (published-only for non-admin readers where already enforced).

### Key Entities

- **Image Generation Workflow**: Published Workflow configuration for kids-fashion image generation; identified by code `kids-fashion-image-generation`; definition holds three agent nodes in a **linear sequential chain** (prep → generate → organize) where the generate node maps `imageGenPrompts` and the organize node maps `rawGenerations` from Shared Context as inputs.
- **Image Generation Execution**: One run of that Workflow; carries input brief plus Design Brief handoff artifacts and Shared Context culminating in `generatedImages`.
- **Image Generation Prompts**: Intermediate structured artifact in context (`imageGenPrompts`) produced by the prep step only from `designBrief` / `designSpecification`: `summary` plus `prompts[]` of `{ id, label, text }` — consumed by the generate step.
- **Raw Generations**: Intermediate array in context (`rawGenerations`) of variation drafts produced by the generate step only; consumed by the organize step; each item has at least `{ id, label }` and optional `promptRef`, `assetUrl`, `notes`. `promptRef`, when present, SHOULD match an `imageGenPrompts.prompts[].id`.
- **Generated Images**: Structured handoff artifact in context: `summary` plus `variations[]` of `{ id, label, promptRef?, assetUrl?, notes? }` — written only by the organize step from `rawGenerations`; `promptRef` remains optional with the same SHOULD-match rule; required Design Review handoff key.
- **Supporting Agents / Prompts / Tools**: Three dedicated Agents and three dedicated Prompts wired one-to-one; generation Agent uses `image-generation` Tool; organize Agent uses `object-storage` Tool; prep Agent may have empty `toolRefs`. Independent of any single Workflow instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seed, an authorized user can start Image Generation and reach a completed Execution with usable `generatedImages` (at least two variations) in Shared Context in under 5 minutes in a guided smoke test (including any async wait).
- **SC-002**: 100% of unauthenticated start/read attempts on this Workflow’s Executions are denied; forbidden vs unauthenticated outcomes remain distinguishable.
- **SC-003**: In acceptance tests, every completed happy-path Execution includes non-empty `imageGenPrompts.summary` with exactly two `prompts` items each having non-blank `id`, `label`, and `text` under default fixtures; `rawGenerations` with exactly two drafts; and non-empty `generatedImages.summary` with exactly two `variations` items, each with non-blank `id` and `label`.
- **SC-004**: Re-running platform seed twice leaves exactly one active Workflow with code `kids-fashion-image-generation` and does not create duplicate active Agent/Prompt codes for the supporting catalog (including the three Image Generation Agents and three Image Generation Prompts).
- **SC-005**: A viewer can read a completed Execution’s status and step list but cannot start Image Generation in 100% of permission checks.
- **SC-006**: Quickstart sample input succeeds on first attempt without undocumented required fields for at least one smoke-test operator.

## Assumptions

- Platform Foundation and Design Brief Workflow are Done: Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library (including published `image-generation` and `object-storage` stubs), Execution Engine, and generic `policies.requiredInputs` enforcement are available.
- This feature is **configuration and seed** (plus docs/tests) on existing modules — not a new NestJS domain module or Fashion microservice.
- Three logical steps map to **three dedicated published Agents** (one Agent code per node) connected in a **linear sequential chain** (no parallel branches). Exact Agent codes are chosen in planning (e.g. `fashion-image-prompt-prep` / `fashion-image-generator` / `fashion-image-organizer`).
- Required Execution input fields include non-blank `season`, `category`, `market`, **and** both Design Brief handoff keys `designBrief` and `designSpecification` (unlike earlier Fashion workflows that could run with only season/category/market). Image Generation does **not** synthesize a brief/spec when those keys are absent — start is rejected.
- Image Generation MAY run **standalone** without a prior Design Brief Execution id, provided the caller injects equivalent `designBrief` / `designSpecification` objects into Execution input.
- Default sample input for quickstart: `season=SS27`, `category=kids-apparel`, `market=VN`, plus minimal injected `designBrief` / `designSpecification` matching Design Brief handoff shapes.
- Shared Context key `generatedImages` is the required handoff key for Design Review Workflow later; intermediate keys are `imageGenPrompts` (prep: `summary` + `prompts[{ id, label, text }]`) and `rawGenerations` (generate). Organize alone produces `generatedImages`.
- If the Agent runner still uses stubs/fixtures, fixtures MUST return JSON matching `imageGenPrompts` / `rawGenerations` / `generatedImages` shapes with **exactly 2** prep prompts, **exactly 2** raw drafts, and **exactly 2** final variations so P1 scenarios pass without live image providers; stub `assetUrl` strings are acceptable.
- Generation Agent MUST wire Tool `image-generation`; organize Agent MUST wire Tool `object-storage`; inventing live provider adapters is out of scope.
- Each of the three dedicated Agents MUST have its own dedicated published Prompt (`promptRef`); three distinct Prompt codes.
- Cancel/retry/history semantics are inherited from Execution; no Image-Generation-specific lifecycle states.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance comes from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Downstream Fashion workflow (Design Review) remains a separate backlog item and MUST NOT be partially implemented here.
