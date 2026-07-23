# Feature Specification: Agent / Prompt Draft Editors — Simple Forms

**Feature Branch**: `020-agent-prompt-draft-editors`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Non-tech designers need simple draft editors for Prompts (template + optional variables) and Agents (input/output fields as a form that becomes a schema), with clear New draft → Edit → Save → Publish. Published versions stay immutable. Reuse existing versioning/update/publish APIs and permissions; avoid raw JSON as the default UX (Advanced optional). BE mainly verifies permissions and supplies FE contract pack if gaps remain. Nice-to-have: warn when renaming agent output fields that Builder node output mapping may need updates."

## Clarifications

### Session 2026-07-21

- Q: When an Agent draft schema is not a flat object (nested objects, arrays with items, oneOf, etc.), what should the simple field form do? → A: **Form edits flat top-level properties only**; nested/complex structure is editable only via **Advanced JSON**, with a warning when complex parts are present.
- Q: Should the Prompt variables form (US4) be in the first MVP release? → A: **No** — MVP = Prompt **template** + Agent I/O forms (+ Advanced JSON); variables form is a **fast follow** on this card or a follow-up.
- Q: If form and Advanced JSON both have unsaved edits, what happens on Save / mode switch? → A: **Active mode wins** — Save persists only the currently visible editor; switching modes while dirty prompts discard/apply first.
- Q: What counts as a valid Agent field name on the simple form? → A: **Identifier style** — letter or underscore first, then letters, digits, underscore only (e.g. `final_result`); empty names still blocked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit Prompt Draft via Form (Priority: P1)

A designer opens a Prompt that has (or creates) a draft version, edits the prompt text in a simple form (not raw configuration dumps), saves the draft, and later publishes. Published content remains read-only until a new draft is created. (Prompt variables form is a fast follow — see US4.)

**Why this priority**: Prompt text is the most common non-tech edit; without a form, designers cannot safely change instructions used by workflows.

**Independent Test**: Create or open a Prompt draft → change template text on the form → Save → reload draft detail → text matches; user without update permission cannot save.

**Acceptance Scenarios**:

1. **Given** a Prompt with a draft version and a user who may update prompts, **When** they change the template on the form and save, **Then** reloading the draft shows the new template.
2. **Given** a published Prompt with no draft, **When** the designer creates a new draft version, **Then** they can edit the draft form while the published version remains unchanged.
3. **Given** a user without prompt update permission, **When** they view the Prompt, **Then** Save (and draft content edit) is unavailable or rejected.
4. **Given** a user without prompt publish permission, **When** they try to publish, **Then** publish is unavailable or rejected while draft save (if they have update) still follows update rules.

---

### User Story 2 - Edit Agent Input & Output Fields via Form (Priority: P1)

A designer opens an Agent draft and manages **Input** and **Output** as a list of fields (name, type, required) instead of editing schema JSON by default. Saving stores a proper object schema derived from that list. An optional Advanced raw JSON mode remains available for power users.

**Why this priority**: Renaming or adding agent I/O fields (e.g. `result` → `final_result`) is a frequent Kids Fashion / Builder need; raw JSON blocks non-tech users.

**Independent Test**: On an Agent draft, add/rename/remove one output field on the form → Save → reload draft → stored input/output schemas match the form (object with properties and required list).

**Acceptance Scenarios**:

1. **Given** an Agent draft and update permission, **When** the designer adds a field (name, type, required) on Input or Output and saves, **Then** the draft schemas reflect that field.
2. **Given** an Agent draft with existing fields, **When** the designer renames or removes a field and saves, **Then** the draft schemas no longer contain the old field name and include the new state.
3. **Given** the default editor, **When** a non-tech designer completes Save, **Then** they are not required to open or edit raw JSON.
4. **Given** Advanced raw JSON is enabled (optional), **When** a power user edits valid schema JSON and saves, **Then** the draft accepts it subject to existing platform validation rules.
5. **Given** a draft schema with nested or non-flat constructs, **When** the designer uses the simple form, **Then** only flat top-level properties are editable there; nested/complex parts remain editable via Advanced JSON and a warning indicates that complexity exists.

---

### User Story 3 - Version Lifecycle: Draft → Publish → New Draft (Priority: P1)

Designers follow a clear lifecycle: create draft version → edit forms → save → publish. After publish, further edits require a new draft. Attempting to change published content in place is blocked with a clear outcome.

**Why this priority**: Matches existing platform versioning; UI must make the immutable-published rule obvious so users do not think Save failed mysteriously.

**Independent Test**: Publish a draft Agent or Prompt → confirm published content is read-only → create new draft → edit → save succeeds on the new draft only.

**Acceptance Scenarios**:

1. **Given** a draft ready to publish and publish permission, **When** the user publishes, **Then** that content becomes the published version and is no longer editable in place.
2. **Given** only a published version (no draft), **When** the user attempts to save content changes without creating a draft, **Then** the system refuses the change with a clear “need draft” outcome.
3. **Given** a viewer (read-only), **When** they open detail, **Then** they can view but not create draft, save, or publish.

---

### User Story 4 - Prompt Variables Form (Priority: P2) — fast follow

Optionally (after MVP), designers manage Prompt variables as a simple name list / form that stays consistent with placeholders used in the template (e.g. names that appear as `{{name}}`), without editing variables schema JSON by default.

**Why this priority**: Improves non-tech safety when prompts use variables; **deferred from MVP** so the first ship can focus on template + Agent I/O forms.

**Independent Test**: Add a variable on the form, save draft, reload — variables definition includes that name; removing it updates the draft accordingly.

**Acceptance Scenarios**:

1. **Given** a Prompt draft and the variables form has shipped, **When** the designer adds or removes a variable via the form and saves, **Then** the draft’s variables definition matches.
2. **Given** invalid or empty variable names, **When** the designer tries to save, **Then** save is blocked with a clear message before calling the server (where FE can validate).

**MVP note**: Not required to mark this card’s MVP Done; may remain on the same card as unchecked fast-follow tasks or a spun-out Todo.

---

### User Story 5 - Rename Output Field Reminder (Priority: P3)

After a designer renames an Agent output field, the UI optionally reminds them that Workflow Builder node output mappings may still reference the old path and should be updated.

**Why this priority**: Nice-to-have; prevents silent empty context after rename without automating mapping fixes.

**Independent Test**: Rename an output field and save; UI shows a reminder (copy or link guidance) mentioning Builder output mapping.

**Acceptance Scenarios**:

1. **Given** an Agent draft where an output field name changed and was saved, **When** the save succeeds, **Then** the UI surfaces a non-blocking reminder about updating Builder node output mapping.
2. **Given** no output field rename, **When** the designer saves other changes, **Then** that rename-specific reminder is not required.

---

### Edge Cases

- Empty field name or invalid name characters → FE blocks save with a clear message. Valid names are **identifier style**: start with a letter or underscore, then only letters, digits, underscore (e.g. `final_result`).
- Duplicate field names on the same Input or Output list → FE blocks save with a clear message (no silent last-write-wins on the form).
- Type limited to MVP set (`string`, `number`, `boolean`) in the primary form; `object` / `array` may be Advanced-only or deferred.
- Non-flat / nested schema present → simple form still lists editable flat top-level properties; nested/`items`/`oneOf` (etc.) only via Advanced JSON; UI warns that complex structure exists so form save does not silently pretend to cover it.
- Form save of flat top-level fields MUST preserve untouched complex schema branches unless the designer explicitly overwrites them via Advanced JSON (no silent wipe of nested structure).
- Form ↔ Advanced dirty conflict → **active mode wins**: Save sends only the currently visible editor; switching modes while dirty requires discard or apply first (no silent dual-buffer merge).
- Concurrent draft edits by two users → last successful save wins; no multi-user locking in MVP.
- Prompt template with `{{var}}` not listed in variables form → allowed in MVP (warn optional); variables form is not a hard parser gate unless product tightens later.
- Missing update permission → no partial save; missing publish permission → cannot publish.
- Soft-deleted or inactive Agent/Prompt → follow existing platform rules for editability.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Designers with update permission MUST be able to edit Prompt draft **template** text via a primary form control (not raw JSON as the default). MVP does **not** require a Prompt variables form (see FR-012 / US4 fast follow).
- **FR-002**: Designers with update permission MUST be able to edit Agent draft **input** and **output** field lists (name, type, required) via forms; the product MUST persist equivalent object schemas derived from those lists. MVP MUST also include Advanced raw JSON for those schemas so nested/complex structure remains editable (per FR-013).
- **FR-003**: Users MUST be able to create a new draft version, save draft content, and publish, each gated by the existing permission model (update vs publish vs read).
- **FR-004**: Published Agent and Prompt versions MUST remain immutable; content changes require a draft.
- **FR-005**: Users without the relevant update permission MUST NOT persist draft content changes; users without publish permission MUST NOT publish.
- **FR-006**: The primary non-tech path MUST NOT require opening raw JSON; an Advanced raw JSON editor MAY be offered.
- **FR-007**: FE MUST validate field names before save: non-empty; **identifier style** (letter or underscore first, then letters/digits/underscore only); reject duplicates on the same Input or Output list with a clear message. (Prompt variable names, when US4 ships, SHOULD use the same rule.)
- **FR-008**: MVP field types on the primary Agent form MUST include at least `string`, `number`, and `boolean`.
- **FR-009**: This feature MUST reuse existing Agent and Prompt versioning, update, and publish capabilities; it MUST NOT introduce a parallel edit API or weaken permission checks.
- **FR-010**: BE scope in this repository is limited to verifying permission gates on existing endpoints and providing/completing FE-facing contracts for draft edit flows where gaps exist.
- **FR-011**: The product SHOULD remind designers after renaming an Agent output field that Workflow Builder output mapping may need a matching update (non-blocking; no automatic mapping rewrite).
- **FR-012**: Prompt variables form is a **fast follow** (not MVP-blocking); when implemented it MUST treat variables as distinct from Agent input/output schemas (no mixing of the two concepts in UI copy).
- **FR-013**: When input/output schemas contain nested or non-flat constructs, the simple form MUST edit only flat top-level properties; nested/complex structure MUST be editable only via Advanced JSON, with a visible warning when such complexity is present; saving flat form fields MUST NOT silently wipe unrelated complex branches.
- **FR-014**: MVP scope is Prompt **template** editor + Agent I/O field forms + Advanced JSON for schemas; Prompt variables form and output-rename Builder reminder (US5) MUST NOT block MVP Done if deferred.
- **FR-015**: When both the simple form and Advanced JSON could diverge, Save MUST persist only the **active (visible) editor**; switching editor mode while dirty MUST prompt the user to discard or apply before switch (no silent merge of both buffers).

### Key Entities

- **Prompt (draft / published)**: Versioned instruction text; optional variables definition; published copy immutable.
- **Agent (draft / published)**: Versioned agent configuration including input and output schemas; published copy immutable.
- **Field definition (form)**: Name, type, required flag; serializes to a property on an object schema.
- **Draft version**: Editable working copy created from versioning flow before publish.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A designer with proper permissions can create a Prompt draft, change the template on the form, save, and confirm the new text on reload within 3 minutes without editing raw JSON.
- **SC-002**: A designer with proper permissions can create an Agent draft, add or rename at least one input and one output field on the forms, save, and confirm the draft schemas match those fields on reload within 5 minutes without editing raw JSON.
- **SC-003**: 100% of attempted draft saves without update permission fail visibly (UI blocked and/or server rejection); 100% of publish attempts without publish permission fail visibly.
- **SC-004**: After publish, a peer can verify the previous published content cannot be overwritten in place and that a new draft is required for further edits.
- **SC-005**: In a short usability check with a non-tech designer, they complete “change prompt text” and “rename one agent output field” using the form path without being forced into Advanced JSON.

## Assumptions

- Existing Agent Registry and Prompt Library versioning / update / publish behaviors remain the source of truth; this feature is primarily UX + contract completeness.
- Owner is mostly FE (`ai-platform-fe`); this BE repo delivers contract pack and permission verification, not a new Nest domain module.
- MVP Agent form types default to `string` | `number` | `boolean`; richer types stay Advanced or a later enhancement.
- Prompt variables form is P2 **fast follow** (not in first MVP); template editing alone satisfies US1 for MVP Done.
- Advanced raw JSON for Agent schemas is **in MVP** (required when nested/complex structure exists).
- Automatic repair of Workflow node output mappings when Agent output fields rename is out of scope.
- Visual full JSON Schema builders (oneOf, $ref, deep nesting) are out of scope.
- Permission names and behaviors already defined by Auth/RBAC and Agent/Prompt features apply unchanged.
