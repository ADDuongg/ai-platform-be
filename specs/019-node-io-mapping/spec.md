# Feature Specification: Builder Node I/O Mapping (FE-led)

**Feature Branch**: `019-node-io-mapping`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Phase B spun out from 018: In Workflow Builder, designers edit per-node inputMapping and outputMapping on draft agent nodes so start fields and upstream context flow into agent steps and agent outputs merge back into shared context. Reuse existing draft node update / definition APIs — no new Nest execution engine. Mapping semantics already live in the Execution context mapper: input left=agent key / right=context path; output left=context key / right=output path. Completes deferred Builder ergonomics after Workflow start inputs A.1/A.2."

## Clarifications

### Session 2026-07-21 (from BACKLOG / 018 Phase B)

- Q: Does BE need new Nest modules or engine changes? → A: **No** — reuse existing draft node update and definition APIs; Execution already applies mappings.
- Q: Who owns the UI? → A: **FE Builder** (`ai-platform-fe`); BE provides typed contract pack for the existing node update surface.
- Q: Mapping value shape for MVP? → A: **String path pairs** as in published seeds / engineering docs (flat or dot-path strings). Literal non-string values remain an advanced edge already supported by the engine but are out of primary UI scope.
- Q: Relation to 018? → A: **Separate feature card** after A.1/A.2 Done; does not reopen start-input CRUD.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Node Input Mapping in Builder (Priority: P1)

A designer opens Builder on a draft Workflow, selects an agent node, and edits that node’s input mapping: which shared-context paths become which agent input keys. They save; the draft definition stores the updated mapping on that node. After publish, runs use the new input mapping.

**Why this priority**: Without editable input mapping, adding a start field (018) still requires seed/API edits to wire the field into a step.

**Independent Test**: On a draft node, change one input mapping pair (e.g. map agent key `season` from context path `season`), save, reload draft definition, confirm the pair is present on that node id.

**Acceptance Scenarios**:

1. **Given** a draft Workflow with at least one agent node, **When** a designer opens the node panel and adds or changes an input-mapping pair and saves, **Then** the draft definition’s that node includes the updated `inputMapping`.
2. **Given** a saved draft with updated input mapping, **When** the designer publishes, **Then** the published definition exposes the same input mapping for that node.
3. **Given** a designer without update permission, **When** they attempt to change mapping, **Then** the change is not persisted.

---

### User Story 2 - Edit Node Output Mapping in Builder (Priority: P1)

A designer edits a node’s output mapping: which agent output paths write which shared-context keys. Save and publish behave like input mapping.

**Why this priority**: Downstream steps and Modules depend on context keys produced by prior nodes; designers must control those keys without hand-editing JSON.

**Independent Test**: Change an output mapping pair (e.g. context key `trendFindings` ← output path `trendFindings`), save, reload draft, confirm.

**Acceptance Scenarios**:

1. **Given** a selected draft agent node, **When** the designer adds/changes/removes an output-mapping pair and saves, **Then** the draft node’s `outputMapping` matches.
2. **Given** published mapping, **When** an Execution runs that node, **Then** shared context receives values according to the published output mapping (existing engine behavior; smoke verification).

---

### User Story 3 - Clear or Empty Mappings (Priority: P2)

A designer can remove all pairs from input or output mapping and save. Empty mapping follows existing platform runtime rules (pass-through / merge behavior already defined by the engine — UI must not invent a different meaning).

**Why this priority**: Prevents stuck incorrect mappings; designers need a way to reset.

**Independent Test**: Clear all pairs for one map on a node, save; draft shows empty object or omitted field per contract; no error.

**Acceptance Scenarios**:

1. **Given** a node with several mapping pairs, **When** the designer deletes all pairs and saves, **Then** the draft persists an empty mapping (or equivalent omit) without failing validation.
2. **Given** empty input mapping at runtime, **When** the step runs, **Then** behavior matches today’s engine (full context passed as input when mapping empty).

---

### User Story 4 - Understand Mapping Semantics in UI (Priority: P2)

The Builder panel labels direction clearly so designers do not reverse left/right: input = agent key ← context path; output = context key ← agent output path.

**Why this priority**: Wrong-direction maps silently break runs; UX clarity is part of the deliverable.

**Independent Test**: A new designer can correctly add one input and one output pair using only on-screen labels (checklist / peer review), matching the documented semantics.

**Acceptance Scenarios**:

1. **Given** the node mapping panel, **When** a designer views the input section, **Then** labels indicate agent-input key and context path (not swapped).
2. **Given** the output section, **When** viewed, **Then** labels indicate context key and agent-output path (not swapped).

---

### Edge Cases

- Duplicate left-side keys in the editor → FE de-dupes or last-write-wins before save; persisted map is a single object keyed by left side.
- Blank key or blank path row → FE does not persist incomplete rows (or rejects save with a clear message).
- Dot-path strings (e.g. `trendFindings.summary`) → allowed as path values when the designer types them; no nested JSON editor required for MVP.
- Selecting another node without saving → FE follows existing Builder dirty-state conventions (prompt or auto-save — do not invent a second pattern).
- Published Workflow opened read-only → mapping visible if product already shows published defs read-only; edits only on draft.
- Very large maps (dozens of keys) → scrollable list is enough; no pagination requirement for MVP.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Designers MUST be able to view and edit `inputMapping` for a selected draft agent node in Workflow Builder.
- **FR-002**: Designers MUST be able to view and edit `outputMapping` for a selected draft agent node in Workflow Builder.
- **FR-003**: Saving MUST persist mapping changes on the correct draft node identity so a subsequent load of the draft definition shows the same pairs.
- **FR-004**: Publishing MUST carry the draft node mappings into the published definition used by Execution.
- **FR-005**: The UI MUST present mapping direction consistent with platform semantics: input `mappedInput[left] = context[right]`; output `nextContext[left] = output[right]`.
- **FR-006**: Designers MUST be able to add, update, and remove individual mapping pairs, including clearing a map entirely.
- **FR-007**: Users without Workflow update permission MUST NOT persist mapping changes.
- **FR-008**: MVP mapping values in the primary UI MUST be string paths (flat or dotted); the feature MUST NOT require a new expression language or visual wire canvas.
- **FR-009**: This feature MUST NOT change Execution merge/mapping runtime rules; it only configures data the existing engine already applies.
- **FR-010**: BE work in this repo is limited to FE-facing contract documentation for the existing node/definition APIs (and any thin gaps); no new business Nest module for mapping.

### Key Entities

- **Workflow draft definition**: Graph of nodes/edges; source of truth for unpublished edits.
- **Agent node**: Step with identity, agent reference, and optional `inputMapping` / `outputMapping`.
- **Input mapping**: Object of agent-input-key → context-path (string).
- **Output mapping**: Object of context-key → agent-output-path (string).
- **Published definition**: Immutable (for a version) graph consumed by Execution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A designer can change at least one input and one output mapping pair on a draft node and confirm them on reload within 2 minutes without editing raw definition JSON.
- **SC-002**: After publish, a smoke Execution on a known seeded Workflow reflects the updated mapping in shared context (verified by presence/absence of expected context keys after the step).
- **SC-003**: 100% of incomplete mapping rows (empty key or path) are blocked or dropped before persist — no silent half-rows in stored definition.
- **SC-004**: Peer review checklist: panel labels match documented left/right semantics with zero ambiguous “source/target” wording that could reverse direction.

## Assumptions

- Workflow Builder and draft node update APIs already exist and accept `inputMapping` / `outputMapping` objects.
- Execution context mapper behavior (including empty-map pass-through/merge) stays unchanged.
- Primary users are `designer` / `admin` with `workflows:update`; operators do not need to edit mappings.
- FE may save via per-node update or full definition replace as long as the persisted draft matches; prefer the existing Builder save path already used for other node fields.
- Auto-suggest from Prompt variables or Agent schemas is out of scope for MVP.
- Contract pack in this backend repo is mandatory for FE consumption even when Nest runtime does not change.
