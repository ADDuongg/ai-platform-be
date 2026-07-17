# Feature Specification: Workflow Management

**Feature Branch**: `003-workflow-management`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Manage AI Workflow lifecycle and versioning as configuration-driven definitions for the AI Workflow Platform after Auth and Agent Registry. Include create/update/delete/clone, draft → published → archived lifecycle, immutable published versions with parallel draft versions, list/get with visibility rules, and RBAC workflows:create|read|update|delete|publish already seeded. Store a definition shell (nodes/edges/variables/policies) but do not mutate the graph (Workflow Builder) or execute (Execution). Out of scope: Builder APIs, Execution, triggers/schedules, marketplace/templates, Active/Deprecated states beyond MVP published/archived."

## Clarifications

### Session 2026-07-14 (auto-resolved for full implement)

- Q: Who mutates Workflows? → A: Holders of `workflows:create|update|delete|publish` (designer/admin/super_admin per Auth seed); operator/viewer read published only
- Q: Empty definition on publish? → A: Allowed in MVP (`nodes`/`edges` arrays may be empty)
- Q: Draft visibility signal? → A: `workflows:update` permission (same pattern as agents using update)
- Q: Clone source? → A: Current published version by default; optional explicit version; never-published draft may be cloned by mutate roles
- Q: Enabled flag? → A: Not in MVP — lifecycle is only `draft` | `published` | `archived`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Browse Workflows (Priority: P1)

A designer (or admin/super_admin) creates a new Workflow as a draft with unique code, name, description, and an empty definition shell (no nodes/edges yet). Users with mutate permissions can list and open Workflows in any non–soft-deleted status including draft. Operators and viewers see **published** Workflows only. Soft-deleted (`archived`) Workflows do not appear in the default list. Duplicate codes are rejected.

**Why this priority**: Without a Workflow catalog and draft creation path, Builder and Execution have nothing to attach to; this is the foundation of configuration-driven workflows.

**Independent Test**: As designer, create two draft Workflows; confirm designer/admin can list drafts; as operator/viewer confirm drafts are hidden and only published appear; confirm duplicate code is rejected; as viewer confirm create is forbidden.

**Acceptance Scenarios**:

1. **Given** a designer with permission to create Workflows and an unused Workflow code, **When** they create a Workflow with required metadata, **Then** a draft Workflow is created with an empty definition shell and can be retrieved by id by that designer (or admin/super_admin).
2. **Given** an existing Workflow code, **When** another create uses the same code, **Then** creation is rejected as a conflict.
3. **Given** multiple Workflows including drafts and published, **When** a designer/admin/super_admin lists Workflows, **Then** they see non–soft-deleted Workflows of all statuses and can filter by status.
4. **Given** the same catalog, **When** an operator/viewer lists or opens Workflows, **Then** they only see/get **published** Workflows (drafts are hidden); soft-deleted remain hidden for everyone by default.
5. **Given** a user without create permission, **When** they attempt to create a Workflow, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** any Workflow Management action is attempted, **Then** access is denied as unauthenticated.
7. **Given** an operator/viewer, **When** they request a draft Workflow by id directly, **Then** access is denied as not found or forbidden (drafts must not leak).

---

### User Story 2 - Update Draft, Publish Immutable Version, and Version Again (Priority: P1)

A designer (or admin/super_admin) updates draft Workflow metadata (and may replace the definition shell as a whole snapshot when allowed on draft versions). When ready, they publish so others can rely on a stable published version. Published version definition and version-bound fields cannot be edited in place; further changes require a new draft version while the Workflow remains `published` at the catalog level. Non-mutate readers continue to see the current published version only.

**Why this priority**: Publish + immutability is what makes Workflow definitions safe to execute and evolve without silent drift for operators and later Execution.

**Independent Test**: As designer, create draft → update metadata → publish → attempt in-place definition edit (must fail) → create new version → publish new version → list versions; as viewer confirm publish is forbidden and draft versions stay hidden.

**Acceptance Scenarios**:

1. **Given** a draft Workflow, **When** a designer updates metadata (or draft definition shell), **Then** changes persist on the draft and remain unpublished until publish.
2. **Given** a draft Workflow, **When** a designer publishes it, **Then** status becomes published, a version number is assigned/confirmed, and the published version is immutable.
3. **Given** a published Workflow version, **When** anyone attempts to change that version’s definition in place, **Then** the change is rejected; that published version remains unchanged.
4. **Given** a published Workflow, **When** a designer creates a new version, **Then** Workflow status remains `published`, a new draft version exists (visible to mutate roles only) that can be edited and later published without altering prior published versions; operators/viewers continue to see the current published version only.
5. **Given** a viewer/operator (no publish permission), **When** they attempt to publish, **Then** access is denied as forbidden.
6. **Given** a published Workflow with an in-progress draft version, **When** an operator/viewer lists or opens versions, **Then** they see published versions only; the in-progress draft version is mutate-role only.

---

### User Story 3 - Clone Workflow (Priority: P2)

A designer (or admin/super_admin) clones an existing Workflow (from current or a chosen published version) into a **new** draft Workflow with a new unique code, copying metadata (with adjustments) and definition shell so they can iterate without mutating the source.

**Why this priority**: Cloning accelerates reuse of proven definitions; secondary to create/publish but required for practical catalog operations before Builder.

**Independent Test**: As designer, publish Workflow A → clone with new code → confirm new draft exists with copied definition and source unchanged; duplicate new code rejected; viewer cannot clone.

**Acceptance Scenarios**:

1. **Given** a published Workflow and an unused new code, **When** a designer clones it, **Then** a new draft Workflow is created with that code and a copy of the source definition; the source Workflow is unchanged.
2. **Given** a clone request that reuses an existing code, **When** clone is attempted, **Then** it is rejected as a conflict.
3. **Given** a user without create permission, **When** they attempt clone, **Then** access is denied as forbidden.

---

### User Story 4 - Retire Workflows (Priority: P2)

Designers (or admin/super_admin) can soft-delete a Workflow to `archived` so it disappears from default catalogs while remaining recoverable for audit. Operators and viewers cannot delete. Archived Workflows are not eligible for new Execution assignment later.

**Why this priority**: Operational control without destroying history; secondary to create/publish/clone.

**Independent Test**: As designer, publish → soft-delete → confirm absent from default list and code remains reserved; as operator/viewer confirm delete is forbidden.

**Acceptance Scenarios**:

1. **Given** a Workflow, **When** a designer soft-deletes it, **Then** status becomes `archived`, it no longer appears in default listings, and cannot be used for new assignment later; historical references remain conceptually valid for later Execution history.
2. **Given** an operator/viewer, **When** they attempt delete, **Then** access is denied as forbidden.

---

### User Story 5 - Role-Appropriate Catalog Access (Priority: P2)

Designers, admins, and super_admins hold Workflow mutate permissions per the seeded Auth matrix. Operators and viewers hold `workflows:read` only and see published Workflows. No new permission codes are required beyond existing `workflows:*`.

**Why this priority**: Confirms Workflow Management is gated by existing Auth+RBAC before Builder/Execution open.

**Independent Test**: As viewer/operator, list/read published succeeds and all mutate actions fail; as designer/admin/super_admin, mutate succeeds; confirm forbidden vs unauthenticated distinction.

**Acceptance Scenarios**:

1. **Given** a viewer or operator with `workflows:read` only, **When** they list or open Workflows, **Then** they succeed for **published** only; drafts are not listed or retrievable; create/update/publish/delete/clone fail as forbidden.
2. **Given** a designer, admin, or super_admin with Workflow mutate permissions, **When** they perform create/update/publish/delete/clone, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** seeded Auth roles, **When** Workflow Management goes live, **Then** no new permission codes are required beyond the existing `workflows:*` set.

---

### Edge Cases

- Creating a new version on a published Workflow does not change Workflow status to `draft`; status stays `published` until archived.
- Only one in-progress draft version MAY exist per Workflow at a time; attempting to create another while a draft version exists → rejected.
- Direct get of a never-published draft Workflow id by operator/viewer → not found or forbidden (no draft leakage).
- Publish when Workflow is already published and no new draft version exists → rejected (clear “already published” / nothing to publish outcome).
- Soft-delete sets status to `archived` and hides from default lists; **active** `code` uniqueness applies only to non–soft-deleted rows (archived codes MAY be reused for a new Workflow).
- Soft-deleted Workflow code reuse → **allowed** after archive (historical row keeps id; new Workflow gets a new id with the same code).
- Concurrent publish of the same draft version → only one succeeds; the other fails safely without corrupting version numbers.
- Clone of an archived Workflow → rejected (or only allowed from non-archived sources); MVP: reject clone from archived.
- Extremely large definition payloads → rejected above a documented size limit.
- Empty definition shell (no nodes/edges) MAY be published in MVP; Builder and Execution will enforce richer validation later.
- Update of version-agnostic metadata (name/description) on a published Workflow MAY be allowed without changing the published version snapshot; definition remains version-immutable when published.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow holders of `workflows:create` (designer/admin/super_admin per seed) to create a new Workflow in `draft` status with unique code, name, description, and an empty definition shell.
- **FR-002**: System MUST reject Workflow creation when the code is already used by a **non–soft-deleted** Workflow. Soft-deleted (archived) Workflows MUST NOT block reuse of the same code.
- **FR-003**: System MUST allow users with `workflows:read` to list Workflows with filters for status, excluding soft-deleted Workflows by default. Operators/viewers MUST only receive **published** Workflows in list results (status filter cannot be used to reveal drafts). Designers/admins/super_admins MAY list all non–soft-deleted statuses including draft.
- **FR-004**: System MUST allow users with `workflows:read` to retrieve a single Workflow by id, including current status and current published/draft version summary — subject to the same visibility rule: operators/viewers MAY retrieve published Workflows only; draft retrieval by those roles MUST fail without leaking existence details beyond not-found/forbidden.
- **FR-005**: System MUST allow holders of `workflows:update` to update draft Workflow metadata and draft version definition shell; published version definition MUST be immutable.
- **FR-006**: System MUST allow holders of `workflows:publish` to publish a draft Workflow/version, producing or confirming an immutable published version.
- **FR-007**: System MUST allow holders of `workflows:update` to create a new editable draft version from a published Workflow without modifying prior published versions. Creating that draft version MUST NOT change Workflow lifecycle status away from `published`. At most one in-progress draft version MAY exist per Workflow.
- **FR-008**: System MUST keep the current published version as the catalog-facing version for operators/viewers while a parallel draft version is being edited; publishing the draft version MUST make it the new current published version immutably.
- **FR-009**: System MUST allow users with `workflows:read` to list and retrieve Workflow versions, including optional changelog notes. Operators/viewers MUST only see **published** versions; in-progress draft versions are mutate-role only.
- **FR-010**: System MUST enforce draft visibility: only designer/admin/super_admin can list or get draft Workflows and unpublished draft versions; operator/viewer catalogs are published-only.
- **FR-011**: System MUST allow holders of `workflows:delete` to soft-delete a Workflow by setting status to `archived` so it is hidden from default catalogs.
- **FR-012**: System MUST model Workflow lifecycle status as exactly `draft` | `published` | `archived`.
- **FR-013**: System MUST enforce authentication on all Workflow Management actions and authorize using existing `workflows:create`, `workflows:read`, `workflows:update`, `workflows:delete`, and `workflows:publish` permissions per the Auth seed matrix.
- **FR-014**: System MUST allow holders of `workflows:create` to clone a non-archived Workflow into a new draft Workflow with a new unique code, copying the chosen source version’s definition shell and adjustable metadata.
- **FR-015**: System MUST store a definition shell structured for later Builder/Engine use (at minimum: nodes, edges; optionally variables and policies) without providing graph mutation operations in this feature.
- **FR-016**: System MUST NOT execute Workflows, invoke Agents/LLMs, or expose Builder graph-edit operations (add/remove/replace/reorder/connect nodes) as part of this feature.
- **FR-017**: System MUST seed at least one sample Workflow (draft or published, empty or minimal definition) as part of platform seed so demos and later Builder work have a starting catalog entry. Seed MUST be idempotent.

### Key Entities

- **Workflow**: A reusable process definition identity with stable code, human-facing metadata, lifecycle status (`draft` | `published` | `archived`), and pointer to current version. Independent of any Execution. `archived` means soft-deleted.
- **Workflow Version**: A snapshot of the definition shell (nodes, edges, optional variables/policies), version number, publication state (draft vs published), and changelog. Published versions are immutable. A Workflow may have many published versions over time and at most one in-progress draft version while remaining `published` at the Workflow level.
- **Definition Shell**: Configuration data describing how Agents will later be connected; empty at create; mutated by Workflow Builder later; stored and versioned here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A designer can create a draft Workflow and retrieve it in under 2 minutes in a guided smoke test.
- **SC-002**: 100% of Workflow Management actions deny unauthenticated callers; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: After publish, attempts to mutate that version’s definition fail in 100% of test cases; a new version path succeeds and leaves the prior published version unchanged.
- **SC-004**: Default Workflow listings never include soft-deleted Workflows in acceptance tests.
- **SC-005**: Operator/viewer users can complete read-only browsing of **published** Workflows only; drafts stay hidden; mutate actions fail for those roles in 100% of permission matrix checks for Workflow Management.
- **SC-006**: In acceptance tests, operator/viewer list/get never returns draft Workflows; designer/admin list can include drafts.
- **SC-007**: Clone produces a new draft Workflow with a distinct code and copied definition while leaving the source unchanged in 100% of clone acceptance tests.
- **SC-008**: After platform seed, the catalog contains at least one sample Workflow visible to an authorized creator/reader without manual create.

## Assumptions

- Authentication & Authorization (Auth + RBAC) is available: JWT identity, permission guards, and seeded `workflows:*` permissions aligned so designer/admin/super_admin mutate Workflows; operator/viewer read published only.
- Agent Registry exists and is available for later node agent references; this feature does not require validating agent refs on empty shells, and does not hard-require FK integrity to Agents for MVP publish of empty graphs.
- Workflow Builder and Execution do not exist yet; graph editing and run/cancel/retry are out of scope.
- Soft-delete hides archived Workflows from default lists; `code` may be reused by a new Workflow after archive (identity remains the row `id`). Explicit restore may be a later enhancement.
- SYSTEM_DESIGN lifecycle states Active/Deprecated are deferred; MVP uses only `draft` | `published` | `archived`.
- Empty definition shells may be published in MVP; richer publish validation (connected graph, agent assignability) belongs to Builder/Execution follow-ups.
- Demo seed of ≥1 sample Workflow is required for MVP and must be idempotent with existing seed flow.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present in the repo; guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
