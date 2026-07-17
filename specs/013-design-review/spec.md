# Feature Specification: Design Review Workflow

**Feature Branch**: `013-design-review`

**Created**: 2026-07-15

**Status**: Implemented

**Input**: User description: "Milestone 2 sixth (final) feature — Kids Fashion Design Review Workflow. Deliver a published business Workflow on Platform Foundation (configuration/seed only, not a new domain NestJS module) that reviews artwork quality from Image Generation outputs, produces improvement suggestions, and assigns a final score in Shared Context. Reuse existing Workflow/Agent/Prompt/Tool/Execution capabilities. Out of scope: Phase 3 modules, live vision/LLM adapters, human approval gates, new fashion-specific public APIs."

## Clarifications

### Session 2026-07-15

- Q: Should Execution start reject when `generatedImages.variations` has fewer than 2 items? → A: No — allow start if `generatedImages` is present/non-blank (generic presence checks); fixtures still use exactly 2 variations.
- Q: Must default stub fixtures include `designReviewScore.perVariation` with one entry per input variation (exactly 2)? → A: Yes — fixtures MUST include `perVariation` with exactly 2 entries; field remains optional for non-fixture runs.
- Q: Must the final score step’s input mapping include `qualityReview` (not only `improvementSuggestions`)? → A: Yes — score step MUST map both `qualityReview` and `improvementSuggestions`.
- Q: Must the quality-review step’s input mapping include `generatedImages` from Shared Context / Execution input? → A: Yes — quality-review step MUST map `generatedImages`.
- Q: How should `qualityReview.findings[].severity` be constrained? → A: Optional free-text; fixtures MAY include severity strings; no enum enforcement.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Generated Artwork and Produce a Final Score (Priority: P1)

A designer or operator with execute permission starts the published **Kids Fashion Design Review** Workflow with a kids-fashion brief (season, category, market) and Image Generation handoff key (`generatedImages` with multiple variations). The Workflow runs three logical steps in order: review quality → improvement suggestions → final score. When Execution completes, the Shared Context contains a quality assessment, actionable suggestions, and a final score suitable to close the Milestone 2 Kids Fashion chain.

**Why this priority**: This is the sixth and final Milestone 2 business outcome — without a runnable Design Review path, the Kids Fashion pipeline cannot produce a scored evaluation of generated artwork.

**Independent Test**: After platform seed, start Execution with sample kids-fashion input (injecting Image Generation–shaped `generatedImages`); wait until status is completed; confirm context includes `qualityReview`, `improvementSuggestions`, and `designReviewScore`; confirm three steps appear in history.

**Acceptance Scenarios**:

1. **Given** the published Workflow `kids-fashion-design-review` and a user with execute permission, **When** they start Execution with valid input (`season`, `category`, `market`, non-blank `generatedImages`), **Then** an Execution is created and progresses through quality review, improvement suggestions, then final scoring until `completed`, and each later step receives required predecessor outputs from Shared Context via input mapping (`generatedImages` → quality; `qualityReview` → suggestions; `qualityReview` + `improvementSuggestions` → score).
2. **Given** a completed Execution, **When** they retrieve Execution detail and steps, **Then** each step shows status, and the final Shared Context includes `designReviewScore` with a non-blank `summary` and a numeric `overallScore`; under default fixtures, `perVariation` is also present with exactly two entries (one per input variation).
3. **Given** a completed Execution, **When** they inspect context keys, **Then** `qualityReview` is present (written by the quality-review step only), `improvementSuggestions` is present (written by the suggestions step only), and `designReviewScore` is present (written by the score step only); **`designReviewScore`** is the required terminal Milestone 2 output contract.
4. **Given** Execution input that includes `generatedImages` matching the documented Image Generation handoff shape (demo fixtures use exactly 2 variations), **When** the Workflow runs, **Then** review steps evaluate those variations (not only season/category/market alone).
5. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start the Workflow, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** they attempt to start or read the Execution, **Then** access is denied as unauthenticated.
7. **Given** missing or blank `season`, `category`, `market`, or `generatedImages`, **When** a user with execute permission attempts to start Design Review, **Then** start is rejected with a clear validation error and no runnable Execution is successfully enqueued.
8. **Given** any other published Workflow whose definition declares required input keys, **When** start omits a declared required key, **Then** start is rejected the same way (generic enforcement already shipped; not Fashion-only).

---

### User Story 2 - Catalog Ready After Seed (Priority: P1)

An admin (or any authorized reader of published catalogs) finds, after a fresh or repeated platform seed, a published Workflow and supporting Agents/Prompts/Tools already wired so Design Review is executable without manual registry setup.

**Why this priority**: Configuration-driven delivery depends on idempotent seed; manual wiring is not acceptable for MVP demo path.

**Independent Test**: Run seed twice; list Workflows/Agents/Prompts/Tools; confirm `kids-fashion-design-review` is published with a non-empty graph; node Agents are published and enabled; Prompt and Tool references used by those Agents are valid published+enabled codes; no duplicate active codes.

**Acceptance Scenarios**:

1. **Given** an empty or existing database, **When** platform seed runs, **Then** Workflow `kids-fashion-design-review` exists as **published** with a non-empty definition (at least three agent nodes and required edges).
2. **Given** seeded Agents for the Workflow nodes, **When** an admin lists them, **Then** three distinct Agents exist (one per step), each published and enabled, with documented input/output expectations suitable for its step.
3. **Given** seeded Prompt and Tool assignments on those Agents, **When** assignment rules are evaluated, **Then** each of the three Agents has a distinct published enabled `promptRef`; the final score Agent MUST reference the published `object-storage` Tool; quality-review and suggestions Agents MAY leave `toolRefs` empty; every `toolRefs` entry MUST point to a published enabled catalog item.
4. **Given** seed has already been applied, **When** seed runs again, **Then** no duplicate active Workflow/Agent/Prompt codes are created and the Design Review catalog remains consistent (idempotent).

---

### User Story 3 - Browse and Understand the Workflow Before Running (Priority: P2)

A designer or operator with read permission opens the published Design Review Workflow, sees its definition (nodes, edges, mappings) and understands required Execution input fields from documentation/quickstart aligned with the Workflow, including how Image Generation outputs must be supplied.

**Why this priority**: Supports safe reuse and handoff; secondary to actually running and seeding.

**Independent Test**: As designer/operator, get published Workflow by code/id; confirm definition readable; follow quickstart sample input successfully (standalone with injected Image Generation–shaped payload).

**Acceptance Scenarios**:

1. **Given** a user with Workflow read permission, **When** they retrieve `kids-fashion-design-review`, **Then** they see published metadata and the published definition graph, including declared required input keys.
2. **Given** the quickstart sample input, **When** they start Execution, **Then** the run succeeds without undocumented required fields.
3. **Given** a viewer (read-only), **When** they open the published Workflow and a completed Execution, **Then** they can read them but cannot mutate definition or start Execution.
4. **Given** a designer with Workflow update permission and a draft version, **When** they update the definition via existing definition update paths to change required input keys, **Then** subsequent starts enforce the updated keys (no new dedicated required-input API required).

---

### User Story 4 - Operational Control of a Failed or Running Run (Priority: P2)

An operator cancels an in-flight Design Review Execution or retries a failed one using existing Execution capabilities; no special Fashion-only cancel/retry rules are introduced.

**Why this priority**: Ops continuity uses Platform Execution already Done; validates this Workflow behaves like any other published Workflow.

**Independent Test**: Start Execution; cancel while running/pending → cancelled; force a failed path (if fixture supports) → retry → progressed or completed per Execution rules.

**Acceptance Scenarios**:

1. **Given** a Design Review Execution in `pending` or `running`, **When** an authorized user cancels it, **Then** status becomes `cancelled` and no further successful step completion is expected.
2. **Given** a Design Review Execution in `failed`, **When** an authorized user retries it, **Then** failed steps may be re-attempted without rewriting the Workflow definition.

---

### Edge Cases

- Missing required input fields (`season`, `category`, `market`, or `generatedImages`) or blank-only values → **start is rejected** with a clear validation error; a runnable Execution is **not** successfully enqueued (generic `policies.requiredInputs`).
- `generatedImages` present but with fewer than two variations → **start is allowed** (MVP enforces key presence only, not array length); stub/fixtures MUST still produce valid review outputs covering every variation provided; happy-path demo fixtures use exactly two variations.
- Malformed `generatedImages` (missing `summary` / empty `variations`) → start is still allowed if the key is non-blank; stub/fixtures MUST still produce valid review outputs when possible; deeper schema validation is out of scope for this feature’s MVP.
- Optional `designBrief` / `designSpecification` absent → Workflow still runs; quality review MAY note limited brief context; fixtures MUST still complete.
- Empty quality findings / empty suggestions after a happy-path fixture → **not allowed**; default fixtures MUST produce non-empty structured `qualityReview` and `improvementSuggestions` so P1 scenarios pass.
- Missing or non-numeric `overallScore` after happy-path fixture → **not allowed**.
- Workflow exists but an Agent referenced by a node is later disabled → new Executions MUST fail validation at start or at the step with a clear error; historical completed Executions remain readable.
- Soft-deleted Workflow code → not startable; after archive + code reuse, only the new active Workflow is startable.
- Concurrent Executions with different inputs → independent; Shared Context is per Execution.
- Stub/fixture agent runner (if live vision/LLM unavailable) → still produces structured JSON matching the documented `qualityReview`, `improvementSuggestions`, and `designReviewScore` shapes so P1 acceptance scenarios pass.
- Extremely large input text → rejected or truncated per existing platform limits; no Fashion-specific size rules required beyond documenting platform defaults.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a published Workflow with stable code `kids-fashion-design-review` representing Kids Fashion Design Review.
- **FR-002**: The Workflow definition MUST include three **linear sequential** agent steps — (1) review quality → (2) improvement suggestions → (3) final score — with edges forming a single chain (no parallel branches). Each step MUST wait for its immediate predecessor to complete successfully before it can run. Each step MUST reference a **distinct** published Agent (three dedicated Agents total — not the same Agent code on multiple nodes). The quality-review step’s input mapping MUST include `generatedImages` from Shared Context / Execution input; the suggestions step’s input mapping MUST include `qualityReview` from Shared Context; the score step’s input mapping MUST include both `qualityReview` and `improvementSuggestions` from Shared Context. The score step MUST NOT run solely on Execution input while ignoring predecessor review artifacts.
- **FR-003**: System MUST accept Execution input that includes at least non-blank `season`, `category`, `market`, and `generatedImages` for Design Review; optional `designBrief`, `designSpecification`, `ageBand`, and `constraints` MAY be provided. Required keys for this Workflow MUST be declared in the Workflow definition (configuration). If any declared required field is missing or blank, System MUST **reject start** with a clear validation error and MUST NOT successfully enqueue a runnable Execution.
- **FR-003b**: Required input keys MUST be stored as part of the Workflow definition configuration (reuse existing `policies.requiredInputs`). Platform seed MUST set the required keys for `kids-fashion-design-review`. Authorized users MAY change required keys only by updating the draft definition through existing definition update capabilities; this feature MUST NOT add new dedicated endpoints solely for editing required-input keys.
- **FR-004**: On successful completion, Shared Context MUST include intermediate `qualityReview` (written by the quality-review step only) with at least: `summary` (text) and `findings` (list). Each finding MUST have a non-blank `id` (text) and `label` (text), and MAY include `severity` (optional free-text — no enum enforcement; fixtures MAY set strings such as `"warning"`), `variationRef` (text referencing a `generatedImages.variations[].id`), and `notes` (text). Shared Context MUST also include intermediate `improvementSuggestions` (written by the suggestions step only) with at least: `summary` (text) and `suggestions` (list). Each suggestion MUST have a non-blank `id` (text) and `label` (text), and MAY include `priority` (text), `variationRef` (text), and `notes` (text). Shared Context MUST include final `designReviewScore` (written by the score step only) with at least: `summary` (text) and `overallScore` (number on a **0–100** scale). `designReviewScore` MAY include `perVariation` (list of `{ variationRef, score, notes? }`), `criteria` (list of `{ id, label, score?, notes? }`), and `notes` (list of text). Default stub/demo fixtures MUST cover **exactly 2** variations from `generatedImages`, produce non-empty `findings` and `suggestions` (at least one item each), a numeric `overallScore`, **and** `perVariation` with **exactly 2** entries (one per input variation, each with non-blank `variationRef` and numeric `score`). For non-fixture runs, `perVariation` remains optional. **Only** the quality-review step MAY write `qualityReview`; **Only** the suggestions step MAY write `improvementSuggestions`; **Only** the score step MAY write `designReviewScore`.
- **FR-005**: System MUST seed Workflow, Agents, Prompts, and Tool assignments required for this Workflow as part of the platform seed flow; seed MUST be idempotent and MUST NOT invent a separate Fashion REST module.
- **FR-006**: Each Workflow node MUST reference a published, enabled Agent; Agents MUST expose input/output expectations consistent with their step (schemas or documented contracts).
- **FR-007**: Each of the three Design Review Agents MUST reference its own dedicated published enabled Prompt via `promptRef` (three distinct Prompt codes). The final score Agent MUST include published enabled Tool code `object-storage` in `toolRefs`. The quality-review and suggestions Agents MAY leave `toolRefs` empty (`[]`). Every `toolRefs` entry MUST point to a published enabled catalog item. Inventing new live vision or LLM adapters is out of scope.
- **FR-008**: Users MUST start, observe, cancel, and retry Design Review Executions using the existing Execution capabilities and permissions (`workflows:execute` / `executions:*`); this feature MUST NOT add new permission codes.
- **FR-009**: System MUST NOT require new public Fashion-specific API routes; all management and execution uses existing Workflow, Agent, Prompt, Tool, and Execution surfaces.
- **FR-010**: System MUST NOT implement Phase 3 business workflows in this feature; System MUST NOT modify Image Generation AC beyond consuming its documented handoff key (`generatedImages`).
- **FR-011**: System MUST NOT implement live third-party vision/LLM adapters as part of this feature; catalog Tool refs and stub/fixture execution outputs are sufficient for MVP acceptance when live adapters are absent.
- **FR-012**: Documentation (quickstart) MUST describe sample input (including Image Generation–shaped `generatedImages` payload), expected context keys, variation coverage expectation (≥2 in demo), and how to verify step history for the seeded Workflow.
- **FR-013**: Designer/operator/viewer visibility and mutate rules for Workflow/Agent catalogs MUST remain unchanged from Platform Foundation (published-only for non-admin readers where already enforced).
- **FR-014**: System MUST NOT introduce human-in-the-loop approval gates or review-board UI requirements in this feature; scoring is produced by the Workflow Agents (stub/fixture for MVP).

### Key Entities

- **Design Review Workflow**: Published Workflow configuration for kids-fashion design review; identified by code `kids-fashion-design-review`; definition holds three agent nodes in a **linear sequential chain** (quality → suggestions → score) where the quality node maps `generatedImages`, the suggestions node maps `qualityReview`, and the score node maps both `qualityReview` and `improvementSuggestions` from Shared Context as inputs.
- **Design Review Execution**: One run of that Workflow; carries input brief plus Image Generation handoff artifact and Shared Context culminating in `designReviewScore`.
- **Quality Review**: Intermediate structured artifact in context (`qualityReview`) produced by the quality-review step only from `generatedImages` (and optional brief/spec): `summary` plus `findings[]` of `{ id, label, severity?, variationRef?, notes? }` where `severity` is optional free-text (no enum) — consumed by the suggestions step.
- **Improvement Suggestions**: Intermediate structured artifact in context (`improvementSuggestions`) produced by the suggestions step only: `summary` plus `suggestions[]` of `{ id, label, priority?, variationRef?, notes? }` — consumed by the score step.
- **Design Review Score**: Terminal structured artifact in context (`designReviewScore`): `summary` plus `overallScore` (0–100); optional `perVariation[]`, `criteria[]`, `notes[]` — written only by the score step. Default fixtures MUST populate `perVariation` with exactly 2 entries.
- **Supporting Agents / Prompts / Tools**: Three dedicated Agents and three dedicated Prompts wired one-to-one; score Agent uses `object-storage` Tool; quality-review and suggestions Agents may have empty `toolRefs`. Independent of any single Workflow instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seed, an authorized user can start Design Review and reach a completed Execution with usable `designReviewScore` (numeric `overallScore`) plus non-empty `qualityReview` and `improvementSuggestions` in Shared Context in under 5 minutes in a guided smoke test (including any async wait).
- **SC-002**: 100% of unauthenticated start/read attempts on this Workflow’s Executions are denied; forbidden vs unauthenticated outcomes remain distinguishable.
- **SC-003**: In acceptance tests, every completed happy-path Execution includes non-empty `qualityReview.summary` with at least one finding (each with non-blank `id` and `label`); non-empty `improvementSuggestions.summary` with at least one suggestion (each with non-blank `id` and `label`); and `designReviewScore` with non-empty `summary`, a numeric `overallScore` on 0–100, and under default fixtures `perVariation` with exactly two entries (each with non-blank `variationRef` and numeric `score`) covering the two input variations.
- **SC-004**: Re-running platform seed twice leaves exactly one active Workflow with code `kids-fashion-design-review` and does not create duplicate active Agent/Prompt codes for the supporting catalog (including the three Design Review Agents and three Design Review Prompts).
- **SC-005**: A viewer can read a completed Execution’s status and step list but cannot start Design Review in 100% of permission checks.
- **SC-006**: Quickstart sample input succeeds on first attempt without undocumented required fields for at least one smoke-test operator.

## Assumptions

- Platform Foundation and Image Generation Workflow are Done: Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library (including published `object-storage` stub), Execution Engine, and generic `policies.requiredInputs` enforcement are available.
- This feature is **configuration and seed** (plus docs/tests) on existing modules — not a new NestJS domain module or Fashion microservice.
- Three logical steps map to **three dedicated published Agents** (one Agent code per node) connected in a **linear sequential chain** (no parallel branches). Exact Agent codes are chosen in planning (e.g. `fashion-quality-reviewer` / `fashion-improvement-suggester` / `fashion-design-scorer`).
- Required Execution input fields include non-blank `season`, `category`, `market`, **and** Image Generation handoff key `generatedImages`. Design Review does **not** synthesize image candidates when that key is absent — start is rejected.
- `designBrief` and `designSpecification` are **optional** inputs (helpful for richer review against intent) but not required to start.
- Design Review MAY run **standalone** without a prior Image Generation Execution id, provided the caller injects equivalent `generatedImages` into Execution input.
- Default sample input for quickstart: `season=SS27`, `category=kids-apparel`, `market=VN`, plus minimal injected `generatedImages` with exactly **2** variations matching Image Generation handoff shape.
- Shared Context terminal key `designReviewScore` closes the Milestone 2 Kids Fashion chain; intermediate keys are `qualityReview` and `improvementSuggestions`.
- `overallScore` uses a **0–100** numeric scale (informed default).
- If the Agent runner still uses stubs/fixtures, fixtures MUST return JSON matching `qualityReview` / `improvementSuggestions` / `designReviewScore` shapes with coverage for **exactly 2** variations, non-empty findings/suggestions, and `designReviewScore.perVariation` with **exactly 2** entries so P1 scenarios pass without live vision/LLM.
- Score Agent MUST wire Tool `object-storage`; inventing live provider adapters is out of scope.
- Each of the three dedicated Agents MUST have its own dedicated published Prompt (`promptRef`); three distinct Prompt codes.
- Cancel/retry/history semantics are inherited from Execution; no Design-Review-specific lifecycle states.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance comes from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Phase 3 business modules remain separate backlog items and MUST NOT be partially implemented here.
