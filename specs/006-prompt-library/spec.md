# Feature Specification: Prompt Library

**Feature Branch**: `006-prompt-library`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Build Prompt Library for the AI Workflow Platform after Auth and Agent Registry. Authorized admins must register and version reusable Prompts (draft → published → archived), enable/disable them, and browse/filter the catalog. Published Prompts are assignable to Agents via the existing opaque prompt reference (promptRef) with validation that the referenced Prompt is published and enabled. Designers/operators/viewers may read published Prompts only. Out of scope: LLM invocation, runtime template rendering, Prompt marketplace, direct Workflow-node Prompt binding, A/B evals, and Tool Library."

## Clarifications

### Session 2026-07-15

- Q: After soft-delete, may the same Prompt `code` be reused by a new Prompt? → A: Yes — code uniqueness applies among active (non–soft-deleted) Prompts only; after `archived`, the same code MAY be used by a new Prompt (Workflow Management pattern, not Agent Registry forever-unique codes).
- Q: After archive + code reuse, what do existing Agent `promptRef` strings resolve to? → A: Code always resolves to the current active Prompt with that code (opaque string model unchanged; reuse replaces what consumers resolve to; version/id pins deferred).
- Q: Must create require non-empty Prompt content, or only publish? → A: Create may have empty template/messages (draft shell); publish MUST reject empty content (neither usable template nor messages).
- Q: Do non-admins see published Prompts with `enabled=false` in the default list? → A: Yes — include them with `enabled=false` visible; assignment remains blocked (align Agent Registry).
- Q: Must platform seed wire sample Agents to sample Prompts? → A: Yes — seed ≥1 published Prompt and MUST set ≥1 sample Agent `promptRef` to that code (idempotent).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Browse Prompts (Priority: P1)

An admin (or super_admin) creates a new Prompt as a draft library entry (unique code, name, description, optional category/tags, and template content). Admins can list and open Prompts in any non–soft-deleted status (including draft). Non-admin readers (designer, operator, viewer) see **published** Prompts only in default list/get. Soft-deleted (`archived`) Prompts do not appear in the default list. Designers do not create or publish Prompts; they consume the published catalog when configuring or reviewing Agent prompt references later.

**Why this priority**: Without a Prompt catalog, Agents cannot reliably reference shared prompt content and Execution cannot later resolve stable prompt codes.

**Independent Test**: As admin, create two draft Prompts; confirm admin can list drafts; as designer/viewer confirm drafts are hidden and only published Prompts appear; confirm duplicate active code is rejected; as designer/viewer confirm create is forbidden.

**Acceptance Scenarios**:

1. **Given** an admin with permission to create Prompts and an unused Prompt code, **When** they register a Prompt with required metadata (content may be empty), **Then** a draft Prompt is created and can be retrieved by id by an admin.
2. **Given** an existing active Prompt code, **When** another create uses the same code, **Then** creation is rejected as a conflict.
3. **Given** multiple Prompts including drafts and published, **When** an admin lists Prompts, **Then** they see non–soft-deleted Prompts of all statuses and can filter by status and category/tag.
4. **Given** the same catalog, **When** a designer/operator/viewer lists or opens Prompts, **Then** they only see/get **published** Prompts (drafts are hidden), including published Prompts with `enabled=false`; soft-deleted remain hidden for everyone by default.
5. **Given** a user without create permission, **When** they attempt to register a Prompt, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** any Prompt Library action is attempted, **Then** access is denied as unauthenticated.
7. **Given** a non-admin reader, **When** they request a draft Prompt by id directly, **Then** access is denied as not found or forbidden (drafts must not leak).
8. **Given** an archived Prompt whose code was `research-brief`, **When** an admin creates a new Prompt with code `research-brief`, **Then** creation succeeds and the new Prompt is distinct from the archived row.

---

### User Story 2 - Configure Draft and Publish Immutable Version (Priority: P1)

An admin (or super_admin) updates a draft Prompt’s content (template and/or messages, optional variables schema, optional model hints). When ready, they publish the Prompt so Agents can reliably reference a stable published code/version. Published version content cannot be edited in place; further changes require a new version.

**Why this priority**: Publish + immutability makes Prompts safely reusable across Agents without silent drift of wording that would change future Executions unexpectedly.

**Independent Test**: As admin, create draft → update content → publish → attempt in-place content edit (must fail) → create new version from published → publish new version → list versions; as designer confirm publish is forbidden.

**Acceptance Scenarios**:

1. **Given** a draft Prompt, **When** an admin updates metadata or content, **Then** changes persist on the draft and remain unpublished until publish.
2. **Given** a draft Prompt with usable content (template and/or messages), **When** an admin publishes it, **Then** status becomes published, a version number is assigned/confirmed, and the Prompt is eligible for Agent assignment.
3. **Given** a draft Prompt with empty template and empty/absent messages, **When** an admin attempts to publish it, **Then** publish is rejected with a clear validation error.
4. **Given** a published Prompt version, **When** anyone attempts to change that version’s content in place, **Then** the change is rejected; content of that published version remains unchanged.
5. **Given** a published Prompt, **When** an admin creates a new version, **Then** Prompt status remains `published`, a new draft version exists (admin-visible only) that can be edited and later published without altering prior published versions; non-admins continue to see the current published version only.
6. **Given** a designer/operator/viewer (no publish permission), **When** they attempt to publish, **Then** access is denied as forbidden.
7. **Given** a published Prompt with an in-progress draft version, **When** an authorized non-admin reader lists or opens versions, **Then** they see published versions only; the in-progress draft version is admin/super_admin only.

---

### User Story 3 - Assign Prompt to Agent (Priority: P1)

An admin (or super_admin) assigns a published, enabled Prompt to an Agent by setting the Agent version’s prompt reference to the Prompt’s stable code (or clears it). Assignment is rejected when the Prompt is missing, not published, disabled, or archived. Historical Agent versions may retain a stale code string after a Prompt is later disabled or archived; only **new** assignment is blocked.

**Why this priority**: Assignment closes the loop between Prompt Library and Agent Registry using the opaque reference already present on Agents; without validation, bad refs would break future Execution resolve.

**Independent Test**: Publish Prompt → set Agent draft `promptRef` to that code (success) → set ref to unknown/disabled/draft code (fail) → clear ref to null (success); as designer confirm Agent mutate still follows Agent permissions.

**Acceptance Scenarios**:

1. **Given** a published enabled Prompt and an editable Agent draft version, **When** an admin sets the Agent prompt reference to that Prompt code, **Then** the reference is stored successfully.
2. **Given** a Prompt that is draft-only, disabled, archived, or nonexistent, **When** an admin attempts to assign its code to an Agent, **Then** the assignment is rejected with a clear validation error.
3. **Given** an Agent with a prompt reference set, **When** an admin clears the reference, **Then** the reference becomes empty and the Agent remains valid.
4. **Given** an Agent whose stored prompt reference points to a Prompt that was later disabled or archived, **When** someone lists the Agent, **Then** the historical reference string remains readable; new assignment of that code fails until the Prompt is again publishable and enabled.
5. **Given** Prompt code `research-brief` was archived and a new Prompt with the same code is later published and enabled, **When** an Agent still holds `promptRef = research-brief` (or an admin assigns that code), **Then** lookup/assignment resolves to the **new active** Prompt — not the archived row.
6. **Given** a user without Agent update permission, **When** they attempt to change an Agent prompt reference, **Then** access is denied as forbidden (assignment mutate uses Agent permissions).

---

### User Story 4 - Enable, Disable, and Retire Prompts (Priority: P2)

Admins (or super_admins) can set `enabled=false` on a Prompt so it should not be newly assigned to Agents, set `enabled=true` later, or soft-delete it to `archived` so it disappears from default catalogs while remaining recoverable for audit. Disable does **not** change lifecycle status (`draft` / `published` remain). Disabled Prompts (`enabled=false`) remain readable for historical Agent references (subject to draft visibility rules).

**Why this priority**: Operational control without destroying history; secondary to create/publish/assign.

**Independent Test**: As admin, publish a Prompt → disable → confirm still readable with enabled=false and new assignment blocked → enable → soft-delete to archived → confirm absent from default list and new assignment blocked; as operator/designer confirm disable/delete is forbidden.

**Acceptance Scenarios**:

1. **Given** a published or draft Prompt with `enabled=true`, **When** an admin disables it, **Then** status is unchanged, `enabled` becomes false, and it is marked as not eligible for new Agent assignment; non-admin published listings still include it with `enabled=false`.
2. **Given** a Prompt with `enabled=false`, **When** an admin enables it, **Then** `enabled` becomes true and it becomes eligible for new assignment again (subject to published status rules).
3. **Given** a Prompt, **When** an admin soft-deletes it, **Then** status becomes `archived`, it no longer appears in default listings, and cannot be used for new assignment; historical Agent references remain as opaque strings.
4. **Given** a designer/operator/viewer, **When** they attempt disable/enable/delete, **Then** access is denied as forbidden.

---

### User Story 5 - Role-Appropriate Catalog Access (Priority: P2)

Designers, operators, and viewers can read Prompt metadata and published content (`prompts:read`). Only `super_admin` and `admin` hold `prompts:create`, `prompts:update`, `prompts:delete`, and `prompts:publish` per the seeded Auth matrix. Designers browse published Prompts for awareness; they do not mutate the Prompt registry. Assigning a Prompt onto an Agent requires Agent update permission (admin/super_admin in the default seed).

**Why this priority**: Confirms Prompt Library is gated by existing Auth+RBAC without new permission codes.

**Independent Test**: As viewer/designer/operator, list/read published succeeds and all Prompt mutate actions fail; as admin/super_admin, mutate succeeds; confirm forbidden vs unauthenticated distinction.

**Acceptance Scenarios**:

1. **Given** a viewer, designer, or operator with `prompts:read` only, **When** they list or open Prompts, **Then** they succeed for **published** Prompts only; drafts are not listed or retrievable; create/update/publish/delete/enable/disable fail as forbidden.
2. **Given** an admin or super_admin with Prompt mutate permissions, **When** they perform create/update/publish/delete/enable/disable, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** seeded Auth roles, **When** Prompt Library goes live, **Then** no new permission codes are required beyond the existing `prompts:*` set.

---

### Edge Cases

- Creating a new version on a published Prompt does not change Prompt status to `draft`; status stays `published` until archived.
- Only one in-progress draft version MAY exist per Prompt at a time; attempting to create another while a draft version exists → rejected.
- Direct get of a never-published draft Prompt id by non-admin → not found or forbidden (no draft leakage).
- Publish when required content is missing (neither non-empty template nor non-empty messages) → rejected with a clear validation error. Create with empty content → allowed.
- Publish when Prompt is already published and no new draft version exists → rejected (clear “already published” / no draft to publish outcome).
- Disable an already disabled Prompt → idempotent success.
- Enable a Prompt that is archived → rejected; restore is out of scope.
- Soft-delete sets status to `archived` (and hides from default lists); it is distinct from `enabled=false`.
- After soft-delete, creating a new Prompt with the same code → allowed (code reserved only among active/non–soft-deleted entries).
- After reuse of a code, Agent `promptRef` strings with that code resolve to the new active Prompt (archived predecessor is ignored for lookup/assignment).
- Concurrent publish of the same draft version → only one succeeds; the other fails safely without corrupting version numbers.
- Retrieve Prompt by code: non-admins only succeed for published enabled or published disabled (readable); archived / draft codes must not leak to non-admins.
- Extremely large template/messages payloads → rejected above a documented size limit.
- Assigning a Prompt version pin beyond current published code (optional future pin by version number) is out of scope for MVP; assignment uses Prompt `code` only, current published content is what Execution will later resolve unless a later feature adds version pins.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admin/super_admin (holders of `prompts:create`) to register a new Prompt in `draft` status with unique code (among active Prompts), name, and description, optional category/tags, and optional content (template and/or messages MAY be empty at create).
- **FR-002**: System MUST reject Prompt registration when the code is already used by an active (non–soft-deleted) Prompt.
- **FR-003**: System MUST allow users with `prompts:read` to list Prompts with filters for status and category/tag, excluding soft-deleted Prompts by default. Non-admin readers MUST only receive **published** Prompts in list results (including published with `enabled=false`). Admins/super_admins MAY list all non–soft-deleted statuses including draft.
- **FR-004**: System MUST allow users with `prompts:read` to retrieve a single Prompt by id or by code, including current status, enabled flag, and current published/draft version summary — subject to draft visibility rules for non-admins. Non-admins MAY retrieve published Prompts with `enabled=false`.
- **FR-005**: System MUST allow admin/super_admin (`prompts:update`) to update draft Prompt metadata and content; published version content MUST be immutable.
- **FR-006**: System MUST allow admin/super_admin (`prompts:publish`) to publish a draft Prompt/version, producing or confirming an immutable published version. Publish MUST require usable content: a non-empty template and/or non-empty messages; empty content MUST be rejected.
- **FR-007**: System MUST allow admin/super_admin (`prompts:update`) to create a new editable draft version from a published Prompt without modifying prior published versions. Creating that draft version MUST NOT change Prompt lifecycle status away from `published`. At most one in-progress draft version MAY exist per Prompt.
- **FR-008**: System MUST keep the current published version as the catalog-facing version for non-admins while a parallel draft version is being edited; publishing the draft version MUST make it the new current published version immutably.
- **FR-009**: System MUST allow users with `prompts:read` to list and retrieve Prompt versions, including optional changelog notes. Non-admins MUST only see **published** versions; in-progress draft versions are admin/super_admin only.
- **FR-010**: System MUST enforce draft visibility: only admin/super_admin can list or get draft Prompts and unpublished draft versions; designer/operator/viewer catalogs are published-only.
- **FR-011**: System MUST allow admin/super_admin (`prompts:update`) to set Prompt `enabled` true/false without changing lifecycle status; Prompts with `enabled=false` remain listable/readable when published (including for non-admins) but MUST be treated as ineligible for new Agent assignment.
- **FR-012**: System MUST allow admin/super_admin (`prompts:delete`) to soft-delete a Prompt by setting status to `archived` so it is hidden from default catalogs; after archive, the same code MAY be reused by a new Prompt.
- **FR-013**: System MUST model Prompt lifecycle status as exactly `draft` | `published` | `archived`. Disable/enable MUST use a separate `enabled` boolean (default true), not a `disabled` status value.
- **FR-014**: System MUST enforce authentication on all Prompt Library actions and authorize using existing `prompts:create`, `prompts:read`, `prompts:update`, `prompts:delete`, and `prompts:publish` permissions. Designer/operator/viewer receive `prompts:read` only in the default seed.
- **FR-015**: System MUST allow Prompt version content as text template and/or structured messages, optional variables schema describing placeholders, and optional model hints metadata (hints are stored only; not executed).
- **FR-016**: System MUST validate Agent prompt-reference assignment: setting a non-empty Agent `promptRef` MUST succeed only when a Prompt with that code exists among **active** Prompts, is `published`, `enabled=true`, and not soft-deleted; lookup MUST ignore archived rows even if they once used the same code. Clearing to empty/null MUST always be allowed for authorized Agent updaters.
- **FR-017**: System MUST NOT invoke LLMs, render templates at runtime, execute Workflows, or manage Tools as part of this feature.
- **FR-018**: System MUST seed at least one published sample Prompt and MUST set at least one sample Agent’s `promptRef` to that Prompt’s code as part of platform seed. Seed MUST be idempotent.
- **FR-019**: System MUST treat Prompt `code` as the sole assignment key for MVP (no Prompt id or version pin stored on Agent). After code reuse, any consumer resolving by code (assignment validation now; Execution later) MUST bind to the current active Prompt with that code.

### Key Entities

- **Prompt**: A reusable prompt identity with stable code, human-facing metadata, lifecycle status (`draft` | `published` | `archived`), `enabled` boolean (default true), and pointer to current version. Independent of any Workflow. Assigned to Agents by opaque code reference.
- **Prompt Version**: A snapshot of content: template and/or messages, optional variables schema, optional model hints, version number, publication state (draft vs published), and changelog. Published versions are immutable. A Prompt may have many published versions over time and at most one in-progress draft version while remaining `published` at the Prompt level.
- **Prompt Assignment**: The act of linking an Agent version’s prompt reference to a Prompt code. Assignment does not copy Prompt content into the Agent; consumers resolve content by code (and later, optionally, by version pin).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can register a draft Prompt, publish it, and retrieve it by code in under 2 minutes in a guided smoke test.
- **SC-002**: 100% of Prompt Library actions deny unauthenticated callers; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: After publish, attempts to mutate that version’s content fail in 100% of test cases; a new version path succeeds and leaves the prior published version unchanged.
- **SC-004**: Default Prompt listings never include soft-deleted Prompts in acceptance tests.
- **SC-005**: Viewer/designer/operator users can complete read-only browsing of **published** Prompts only; drafts stay hidden; Prompt mutate actions fail for those roles in 100% of permission matrix checks.
- **SC-006**: In acceptance tests, assigning a published enabled Prompt code to an Agent succeeds; assigning draft/disabled/archived/unknown codes fails 100% of the time; clearing the reference succeeds.
- **SC-007**: After platform seed, the catalog contains at least one published sample Prompt visible to non-admin readers, and at least one sample Agent references that Prompt via `promptRef`, without manual create.

## Assumptions

- Authentication & Authorization (Auth + RBAC) is available: JWT identity, permission guards, and seeded `prompts:*` permissions aligned so only admin/super_admin mutate Prompts; designer/operator/viewer read only.
- Agent Registry is available with opaque `promptRef` on Agent versions; Prompt Library adds validation on assignment without requiring a hard database foreign key from Agents to Prompts.
- Soft-delete allows code reuse after archive (align Workflow Management active-code uniqueness), distinct from Agent Registry’s “code unique including soft-deleted” rule — confirmed clarify 2026-07-15.
- After code reuse, opaque Agent `promptRef` strings resolve to the current active Prompt with that code; MVP does not store Prompt id/version pins on Agents — confirmed clarify 2026-07-15.
- Draft create may omit content; non-empty template and/or messages are required only at publish — confirmed clarify 2026-07-15.
- Non-admin published catalog includes `enabled=false` Prompts (flag visible; assignment blocked) — confirmed clarify 2026-07-15.
- Platform seed MUST include ≥1 published sample Prompt and MUST wire ≥1 sample Agent `promptRef` to that code (idempotent) — confirmed clarify 2026-07-15.
- LLM providers, prompt evaluation, marketplace sharing, and Execution-time rendering are out of scope; this feature is registry/catalog + assignment validation only.
- Non-admin Prompt catalog visibility is published-only; draft Prompts and unpublished draft versions are admin/super_admin only.
- Disable/enable is modeled solely via `enabled` boolean; lifecycle status is only `draft` | `published` | `archived`. Soft-delete uses `archived`.
- After first publish, further edits happen on a parallel draft version while Prompt status stays `published`; non-admins keep seeing the current published version until the draft is published.
- Demo seed of ≥1 published sample Prompt is required for MVP and must be idempotent with existing platform seed flow.
- Direct Workflow-node Prompt binding is out of scope; Prompts are consumed via Agents.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present in the repo; product/engineering guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
