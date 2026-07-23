# Feature Specification: Workflow Start Inputs + Builder I/O Mapping (FE-led)

**Feature Branch**: `018-workflow-start-inputs`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "FE-led feature: Builder configures Workflow start inputs on draft policies; Modules Start-a-run generates a dynamic form from published definition policies (requiredInputs, later inputSchema widgets); submit execute with matching input keys. Source of truth is Workflow definition_json.policies on existing BE APIs — no new Nest engine for MVP. Phase A.1 text-only requiredInputs first; A.2 inputSchema widgets later; Phase B node inputMapping/outputMapping UI later. Adding an operational field = data/config (+ prompt/mapping if LLM), not hardcoding per Modules operator."

## Clarifications

### Session 2026-07-21 (from BACKLOG product/FE)

- Q: Does BE need new Nest modules/APIs for Phase A.1? → A: **No** — reuse `GET`/`PUT .../definition`, publish, and existing Execution start validation of `policies.requiredInputs`.
- Q: Who owns widget catalog (`text`/`textarea`/`select`/`date`)? → A: **FE** — BE persists `inputSchema` as opaque JSON in `policies` (Phase A.2+); no DB enum/table for widgets.
- Q: Order of delivery? → A: **A.1** (requiredInputs + text form) → **A.2** (inputSchema widgets) → **B** (node I/O mapping UI). A.1/A.2 must not wait on B.
- Q: How do Modules resolve a Workflow by known `workflowCode`? → A: FE keeps operator→code config; resolve id via list/get Workflow APIs (no mandatory new by-code route for MVP).
- Q: Where does FE edit start-input schema vs defaults? → A: **Workflow detail (main)** — add/update/delete keys + label/widget/options/placeholder; **Builder** — edit `inputSchema[key].default` only for existing keys.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Start Inputs on Workflow Detail (Priority: P1)

A designer opens the Workflow **detail** screen (not the graph Builder), adds/removes/updates start input keys (and later label/widget metadata) on the draft Workflow, saves the definition so `policies.requiredInputs` / `inputSchema` reflect the list, and publishes. After publish, those keys become the required start fields for operators.

**Why this priority**: Without configuration, Modules cannot stop hardcoding field lists; this is the configuration half of the value.

**Independent Test**: On a draft Workflow from the detail screen, set `requiredInputs` to a known list including a new key, save, publish; read published definition and confirm the list matches.

**Acceptance Scenarios**:

1. **Given** a draft Workflow on the detail screen, **When** a designer adds a start input key and saves the definition, **Then** the draft definition’s start-required keys include that key.
2. **Given** a draft with start keys, **When** the designer removes a key and saves, **Then** that key is no longer in the required start list.
3. **Given** a saved draft with start keys, **When** the designer publishes, **Then** the published definition exposes the same required start keys to operators.

---

### User Story 1b - Builder Edits Start Defaults Only (Priority: P2)

A designer opens Builder for a draft that already has start keys. They can set or change each field’s `inputSchema[key].default` (prefill for Modules / Run). They do **not** add/remove keys or change widget/options in Builder (those stay on Workflow detail).

**Why this priority**: Separates structural schema edits from run-time prefill tweaks while designing the graph.

**Independent Test**: Change `default` for `audience` in Builder, save definition; Modules Start form (or Run) shows the new prefill.

**Acceptance Scenarios**:

1. **Given** draft keys `topic` and `audience`, **When** a designer sets `audience.default` to `teens` in Builder and saves, **Then** the draft `inputSchema.audience.default` is `teens`.
2. **Given** Builder open, **When** the designer looks for add/remove start-field controls, **Then** those controls are not the primary Builder path (schema CRUD lives on Workflow detail).

---

### User Story 2 - Modules Start Run Uses Dynamic Text Fields (Priority: P1)

An operator opens a Modules “Start a run” screen for a published Workflow. The UI loads the published definition and renders one text input per required start key (label derived from the key). Submitting sends an input object whose keys match those required fields. Missing required values are rejected by the platform as today.

**Why this priority**: This removes permanent hardcoding of season/category/… in Modules operators.

**Independent Test**: Point one Modules operator (e.g. Trend Research) at a published Workflow; change published `requiredInputs` to add `productLine`; without changing the operator’s hardcoded field list, the form shows the new field and start succeeds when all required keys are filled.

**Acceptance Scenarios**:

1. **Given** a published Workflow with required start keys, **When** an operator opens Start a run, **Then** the form shows one text control per required key (no unrelated hardcoded-only fields as the source of truth).
2. **Given** that form, **When** the operator fills all required keys and starts, **Then** an Execution is created with those keys in the start input.
3. **Given** a required key left blank, **When** the operator starts, **Then** the start is rejected and no runnable Execution is successfully enqueued.
4. **Given** a newly published required key, **When** the operator refreshes Start a run, **Then** the new field appears without a Modules code change that hardcodes that key’s name.

---

### User Story 3 - Optional Input Schema Widgets (Priority: P2)

After A.1, designers can attach optional UI metadata per key (`label`, `widget`, `options`, `placeholder`). Modules map known widgets to controls; unknown/missing widgets fall back to text. Requiredness still comes only from the required-keys list.

**Why this priority**: Improves operator UX (select/date/textarea) without blocking the text-only MVP.

**Independent Test**: Publish a key with widget `select` and options; Modules renders a select; an unknown widget renders as text.

**Acceptance Scenarios**:

1. **Given** UI metadata with widget `select` and options, **When** Modules renders Start a run, **Then** that field is a select with those options.
2. **Given** widgets `date` or `textarea`, **When** Modules renders, **Then** matching controls appear.
3. **Given** missing or unknown widget metadata, **When** Modules renders, **Then** the field falls back to a text control.
4. **Given** UI metadata present for a key not in the required list, **When** Modules builds the required form, **Then** requiredness still follows only the required-keys list (metadata alone does not force required).

---

### User Story 4 - Node I/O Mapping UI Later (Priority: P3)

Designers can edit per-node input/output mapping in Builder using existing update-node capabilities. This does not block A.1/A.2.

**Why this priority**: Needed for full Builder ergonomics when wiring new start fields into steps, but start-form dynamism works without it if mappings/seeds already exist.

**Independent Test**: Update a draft node’s mappings, save, publish; definition reflects the mappings.

**Acceptance Scenarios**:

1. **Given** a draft node, **When** a designer updates input or output mapping and saves, **Then** the draft definition stores those mappings on the node.
2. **Given** A.1 or A.2 incomplete, **When** planning delivery, **Then** node mapping UI is scheduled separately and does not block start-input work.

---

### Edge Cases

- Empty `requiredInputs` → Modules may show no required fields; start may succeed with empty/partial input per existing platform rules.
- Duplicate keys in the required list → FE should de-dupe on save; platform treats keys as a set of names to check.
- `inputSchema` key without matching `requiredInputs` entry → optional UI hint only; not required at start.
- Operator without publish/mutate permissions → can still read published definition and start if execute permissions allow.
- Draft vs published: Modules Start a run MUST use published definition, not unsaved draft.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Designers MUST be able to add, edit, and remove Workflow start input keys on a draft definition such that the required-keys list is persisted with the Workflow definition.
- **FR-002**: Publishing a Workflow MUST make the published required-keys list available to operators reading the published definition.
- **FR-003**: Modules Start-a-run MUST render start fields from the published required-keys list (Phase A.1: all text controls) rather than a permanently hardcoded per-module field list as the source of truth.
- **FR-004**: Starting an Execution MUST send an input object whose keys correspond to the filled start fields; the platform MUST continue to reject starts that omit blank/missing required keys per existing policy.
- **FR-005**: Adding a new operational start field MUST be achievable by updating Workflow definition (and Prompt/node mapping if the step needs the value) without changing Nest start-validation logic and without shipping a new hardcoded field name in each Modules operator (except temporary fallback).
- **FR-006**: Phase A.2 MUST allow optional per-key UI metadata (label, widget, options, placeholder) stored with the Workflow definition; Modules MUST map known widgets and fall back to text.
- **FR-007**: Widget type vocabulary for MVP MUST be owned by the FE (`text`, `textarea`, `select`, `date`); the platform MUST NOT require a server-side widget registry table for MVP.
- **FR-008**: Phase B MUST allow editing node input/output mappings via existing definition/node update capabilities; this MUST NOT block A.1/A.2.
- **FR-009**: This feature’s backend deliverable in the API platform repo MAY be limited to a complete FE-facing contract pack documenting existing endpoints and the `policies` shape; new Nest runtime behavior is not required for A.1.

### Key Entities

- **Workflow definition policies**: Workflow-level configuration including required start keys and optional per-key UI metadata.
- **Start input key**: A string name that must be non-blank in Execution start input when listed as required.
- **Start field UI metadata**: Optional label/widget/options/placeholder for a key (Phase A.2).
- **Execution start input**: Free-form object submitted at start; keys aligned with start fields.
- **Node I/O mapping**: Per-node maps that move context/input into agent steps (Phase B UI).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least one Modules Start-a-run screen builds its required fields from the published Workflow required-keys list (text-only) instead of a fixed hardcoded list as source of truth.
- **SC-002**: A designer can add a new start key, publish, and an operator sees that field on Start a run without a Modules release that hardcodes the new key name.
- **SC-003**: Starting without a required key continues to fail as it does today (operator sees a clear validation failure).
- **SC-004**: FE can integrate against a complete contract pack (OpenAPI + typed client types/interfaces) for definition get/put, publish, execute, and policies shape including optional `inputSchema`.
- **SC-005**: Phase A.2: select/date/textarea widgets render correctly when metadata is present; unknown widgets degrade to text.

## Assumptions

- Workflow Builder / Management and Execution start validation of required keys already exist and remain the system of record.
- Modules operators already know which Workflow code they operate (config/constant); resolving id via existing list/get is acceptable for MVP.
- Prompt template and node mapping updates for new fields may use existing Prompt/Workflow APIs or seeds; full Prompt UI is out of this card’s FE scope unless already available.
- Phase 3 business modules remain parked; this card is a Platform Improvement for Kids Fashion Modules + Builder.
- Auth/RBAC permissions for definition mutate, publish, and execute are unchanged.
