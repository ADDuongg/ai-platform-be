# Feature Specification: Agent Registry

**Feature Branch**: `002-agent-registry`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Register and manage AI Agents as independent, reusable capabilities for the AI Workflow Platform before Workflow Management / Builder / Execution. Include agent lifecycle (draft → published → disabled → archived), versioning with immutable published versions, enable/disable, list/get with filters, and RBAC permissions agents:create|read|update|delete|publish already seeded in Auth. Out of scope: agent runtime/LLM invocation, full Prompt/Tool binding modules, marketplace, hot-swap in running executions, external webhook agents."

## Clarifications

### Session 2026-07-14

- Q: Who can create & publish Agents? → A: Admin/super_admin mutate only; designer/operator/viewer read only (matches Auth permission matrix)
- Q: Who can see draft Agents? → A: Non-admins see published only; admins/super_admins see all non–soft-deleted statuses including draft
- Q: How is “disabled” modeled? → A: Status = draft | published | archived (soft-delete); separate `enabled` boolean for disable/enable
- Q: Status while a new draft version is in progress? → A: Agent stays `published`; parallel draft version (admin-only) until next publish
- Q: Are demo seed Agents required for MVP? → A: Required — seed ≥2 published sample Agents (e.g. Research, Review) in platform seed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Browse Agents (Priority: P1)

An admin (or super_admin) creates a new Agent as a draft capability (unique code, name, description, capability type, and input/output contract). Admins can list and open Agents in any non–soft-deleted status (including draft). Non-admin readers (designer, operator, viewer) see **published** Agents only in default list/get (published Agents with `enabled=false` may still appear but are not assignable). Soft-deleted (`archived`) Agents do not appear in the default list. Designers do not create or publish Agents; they only consume the published catalog when building Workflows later.

**Why this priority**: Without a registry of Agents, Workflow Builder cannot assign steps and the Platform cannot reuse capabilities across workflows.

**Independent Test**: As admin, create two draft Agents; confirm admin can list drafts; as designer/viewer confirm drafts are hidden and only published Agents appear; confirm duplicate code is rejected; as designer/viewer confirm create is forbidden.

**Acceptance Scenarios**:

1. **Given** an admin with permission to create Agents and an unused Agent code, **When** they register an Agent with required metadata and input/output contract, **Then** a draft Agent is created and can be retrieved by id by an admin.
2. **Given** an existing Agent code, **When** another create uses the same code, **Then** creation is rejected as a conflict.
3. **Given** multiple Agents including drafts and published, **When** an admin lists Agents, **Then** they see non–soft-deleted Agents of all statuses and can filter by status and capability type.
4. **Given** the same catalog, **When** a designer/operator/viewer lists or opens Agents, **Then** they only see/get **published** Agents (drafts are hidden); soft-deleted remain hidden for everyone by default.
5. **Given** a user without create permission, **When** they attempt to register an Agent, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** any Agent registry action is attempted, **Then** access is denied as unauthenticated.
7. **Given** a non-admin reader, **When** they request a draft Agent by id directly, **Then** access is denied as not found or forbidden (drafts must not leak).

---

### User Story 2 - Configure Draft and Publish Immutable Version (Priority: P1)

An admin (or super_admin) updates a draft Agent’s configuration (timeout/retry defaults, optional prompt/tool references as opaque codes, input/output contract). When ready, they publish the Agent so designers can rely on a stable published version when assigning Workflow steps. Published configuration cannot be edited in place; further changes require a new version.

**Why this priority**: Publish + immutability is what makes Agents safely reusable and replaceable across Workflows without silent drift.

**Independent Test**: As admin, create draft → update config → publish → attempt in-place config edit (must fail) → create new version from published → publish new version → list versions; as designer confirm publish is forbidden.

**Acceptance Scenarios**:

1. **Given** a draft Agent, **When** an admin updates metadata or configuration, **Then** changes persist on the draft and remain unpublished until publish.
2. **Given** a draft Agent with a complete contract, **When** an admin publishes it, **Then** status becomes published, a version number is assigned/confirmed, and the Agent is available for Workflow assignment (once Workflow features exist).
3. **Given** a published Agent version, **When** anyone attempts to change that version’s configuration in place, **Then** the change is rejected; configuration of that published version remains unchanged.
4. **Given** a published Agent, **When** an admin creates a new version, **Then** Agent status remains `published`, a new draft version exists (admin-visible only) that can be edited and later published without altering prior published versions; non-admins continue to see the current published version only.
5. **Given** a designer/operator/viewer (no publish permission), **When** they attempt to publish, **Then** access is denied as forbidden.
6. **Given** a published Agent with an in-progress draft version, **When** an authorized non-admin reader lists or opens versions, **Then** they see published versions only (including changelog/notes when provided); the in-progress draft version is admin/super_admin only.

---

### User Story 3 - Enable, Disable, and Retire Agents (Priority: P2)

Admins (or super_admins) can set `enabled=false` on an Agent so it should not be newly assigned in Workflows, set `enabled=true` later, or soft-delete it to `archived` so it disappears from default catalogs while remaining recoverable for audit. Disable does **not** change lifecycle status (`draft` / `published` remain). Disabled Agents (`enabled=false`) remain readable for historical Workflow definitions. Operators and designers cannot enable, disable, or delete Agents.

**Why this priority**: Operational control without destroying history; required before production Workflow building, but secondary to create/publish.

**Independent Test**: As admin, publish an Agent → disable (`enabled=false`, status stays published) → confirm still readable and listed with enabled=false → enable → soft-delete to archived → confirm absent from default list and code remains reserved; as operator/designer confirm disable/delete is forbidden.

**Acceptance Scenarios**:

1. **Given** a published or draft Agent with `enabled=true`, **When** an admin disables it, **Then** status is unchanged, `enabled` becomes false, and it is marked as not eligible for new Workflow assignment.
2. **Given** an Agent with `enabled=false`, **When** an admin enables it, **Then** `enabled` becomes true and it becomes eligible for new assignment again (subject to published status rules).
3. **Given** an Agent, **When** an admin soft-deletes it, **Then** status becomes `archived`, it no longer appears in default listings, and cannot be used for new assignment; historical references remain conceptually valid for later Execution history features.
4. **Given** a designer/operator/viewer, **When** they attempt disable/enable/delete, **Then** access is denied as forbidden.

---

### User Story 4 - Role-Appropriate Catalog Access (Priority: P2)

Designers, operators, and viewers can read Agent metadata (`agents:read`). Only `super_admin` and `admin` hold `agents:create`, `agents:update`, `agents:delete`, and `agents:publish` per the seeded Auth matrix. Designers assign published Agents inside Workflow Builder later; they do not mutate the registry.

**Why this priority**: Confirms Agent Registry is gated by existing Auth+RBAC before Workflow surfaces open.

**Independent Test**: As viewer/designer/operator, list/read succeeds and all mutate actions fail; as admin/super_admin, mutate succeeds; confirm forbidden vs unauthenticated distinction.

**Acceptance Scenarios**:

1. **Given** a viewer, designer, or operator with `agents:read` only (no mutate permissions), **When** they list or open Agents, **Then** they succeed for **published** Agents only; drafts are not listed or retrievable; create/update/publish/delete/enable/disable fail as forbidden.
2. **Given** an admin or super_admin with Agent mutate permissions, **When** they perform create/update/publish/delete/enable/disable, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** seeded Auth roles, **When** Agent Registry goes live, **Then** no new permission codes are required beyond the existing `agents:*` set; role matrix remains: admin/super_admin CRUD+publish, others read (designer may assign in Workflow features later).

---

### Edge Cases

- Creating a new version on a published Agent does not change Agent status to `draft`; status stays `published` until archived.
- Only one in-progress draft version MAY exist per Agent at a time; attempting to create another while a draft version exists → rejected.
- Direct get of a never-published draft Agent id by non-admin → not found or forbidden (no draft leakage).
- Publish when required input/output contract is missing or empty → rejected with a clear validation error.
- Publish when Agent is already published and no new draft version exists → rejected (idempotent “already published” or no-op with clear outcome).
- Disable an already disabled Agent (`enabled` already false) → idempotent success.
- Enable an Agent that is archived → rejected; restore is out of scope (recreate with a new code, or later restore feature).
- Soft-delete sets status to `archived` (and hides from default lists); it is distinct from `enabled=false`.
- Create Agent with invalid capability type (outside allowed set) → rejected.
- Concurrent publish of the same draft version → only one succeeds; the other fails safely without corrupting version numbers.
- Soft-deleted Agent code reuse → rejected while soft-deleted row retains the code (code remains unique including soft-deleted), unless an explicit restore path is used.
- Update published Agent metadata that is version-agnostic (name/description) → allowed for non-contract fields; contract/config fields remain version-immutable when published.
- Extremely large input/output contract payloads → rejected above a documented size limit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admin/super_admin (holders of `agents:create`) to register a new Agent in `draft` status with unique code, name, description, capability type, and input/output contract.
- **FR-002**: System MUST reject Agent registration when the code is already used (including soft-deleted Agents).
- **FR-003**: System MUST allow users with `agents:read` to list Agents with filters for status and capability type, excluding soft-deleted Agents by default. Non-admin readers MUST only receive **published** Agents in list results (status filter cannot be used to reveal drafts). Admins/super_admins MAY list all non–soft-deleted statuses including draft.
- **FR-004**: System MUST allow users with `agents:read` to retrieve a single Agent by id, including current status, enabled flag, and current published/draft version summary — subject to the same visibility rule: non-admins MAY retrieve published Agents only; draft retrieval by non-admins MUST fail without leaking existence details beyond not-found/forbidden.
- **FR-005**: System MUST allow admin/super_admin (`agents:update`) to update draft Agent configuration and metadata; published version configuration MUST be immutable.
- **FR-006**: System MUST allow admin/super_admin (`agents:publish`) to publish a draft Agent/version, producing or confirming an immutable published version.
- **FR-007**: System MUST allow admin/super_admin (`agents:update`) to create a new editable draft version from a published Agent without modifying prior published versions. Creating that draft version MUST NOT change Agent lifecycle status away from `published`. At most one in-progress draft version MAY exist per Agent.
- **FR-019**: System MUST keep the current published version as the catalog-facing version for non-admins while a parallel draft version is being edited; publishing the draft version MUST make it the new current published version immutably.
- **FR-008**: System MUST allow users with `agents:read` to list and retrieve Agent versions, including optional changelog notes. Non-admins MUST only see **published** versions; in-progress draft versions are admin/super_admin only.
- **FR-017**: System MUST enforce draft visibility: only admin/super_admin can list or get draft Agents and unpublished draft versions; designer/operator/viewer catalogs are published-only.
- **FR-009**: System MUST allow admin/super_admin (`agents:update`) to set Agent `enabled` true/false without changing lifecycle status; Agents with `enabled=false` remain readable (subject to draft visibility rules) but MUST be treated as ineligible for new Workflow assignment.
- **FR-010**: System MUST allow admin/super_admin (`agents:delete`) to soft-delete an Agent by setting status to `archived` so it is hidden from default catalogs.
- **FR-018**: System MUST model Agent lifecycle status as exactly `draft` | `published` | `archived`. Disable/enable MUST use a separate `enabled` boolean (default true), not a `disabled` status value.
- **FR-011**: System MUST enforce authentication on all Agent Registry actions and authorize using existing `agents:create`, `agents:read`, `agents:update`, `agents:delete`, and `agents:publish` permissions. Per Auth matrix, designer/operator/viewer receive `agents:read` only; they MUST NOT receive Agent mutate permissions in the default seed.
- **FR-012**: System MUST support capability types covering at least: research, image_search, analysis, generation, review, translation, and custom.
- **FR-013**: System MUST allow optional opaque references to prompt codes and tool codes on a version (string references only; no requirement that Prompt/Tool registries exist yet).
- **FR-014**: System MUST allow version-level default timeout and max-retry metadata for later Execution use (stored only; not executed in this feature).
- **FR-015**: System MUST NOT invoke LLMs, run Agents, or execute Workflows as part of this feature.
- **FR-020**: System MUST seed at least two published sample Agents (e.g. Research and Review) as part of platform seed so the catalog is usable for demos without manual setup. Seed MUST be idempotent.

### Key Entities

- **Agent**: A reusable capability identity with stable code, human-facing metadata, lifecycle status (`draft` | `published` | `archived`), `enabled` boolean (default true), and pointer to current version. Independent of any Workflow. `archived` means soft-deleted; `enabled=false` means not assignable but still in catalog when status is draft/published.
- **Agent Version**: A snapshot of configuration: input/output contract, timeout/retry defaults, optional prompt/tool references, version number, publication state (draft vs published), and changelog. Published versions are immutable. An Agent may have many published versions over time and at most one in-progress draft version while remaining `published` at the Agent level.
- **Capability Type**: Classification of what the Agent does (research, generation, review, etc.) used for filtering and later Workflow design guidance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can register a draft Agent and retrieve it in under 2 minutes in a guided smoke test.
- **SC-002**: 100% of Agent Registry actions deny unauthenticated callers; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: After publish, attempts to mutate that version’s configuration fail in 100% of test cases; a new version path succeeds and leaves the prior published version unchanged.
- **SC-004**: Default Agent listings never include soft-deleted Agents in acceptance tests.
- **SC-005**: Viewer/designer/operator users can complete read-only browsing of **published** Agents only; drafts stay hidden; mutate actions fail for those roles in 100% of permission matrix checks for Agent Registry.
- **SC-007**: In acceptance tests, non-admin list/get never returns draft Agents; admin list can include drafts.
- **SC-006**: After platform seed, the catalog contains at least two published sample Agents (e.g. Research and Review) visible to non-admin readers without manual create.

## Assumptions

- Authentication & Authorization (Auth + RBAC) is available: JWT identity, permission guards, and seeded `agents:*` permissions aligned so only admin/super_admin mutate Agents; designer/operator/viewer read only.
- Public self-registration is not part of this feature; users already exist via Auth admin provisioning.
- Workflow Management / Builder / Execution do not exist yet; “ineligible for new Workflow assignment” is enforced by `status=published` AND `enabled=true` in this feature and will be consumed later by Workflow features.
- Soft-delete retains unique `code` to prevent silent reuse collisions; explicit restore may be a later enhancement (out of scope unless added in clarify).
- Opaque prompt/tool string refs are sufficient until Prompt Library and Tool Library ship; no foreign-key integrity to those modules in this feature.
- Agent runtime, model providers, and tool execution are out of scope; this feature is registry/catalog only.
- Non-admin Agent catalog visibility is published-only; draft Agents and unpublished draft versions are admin/super_admin only.
- Disable/enable is modeled solely via `enabled` boolean; lifecycle status is only `draft` | `published` | `archived` (no `disabled` status). Soft-delete uses `archived`.
- After first publish, further edits happen on a parallel draft version while Agent status stays `published`; non-admins keep seeing the current published version until the draft is published.
- Demo seed of ≥2 published sample Agents (e.g. Research, Review) is required for MVP and must be idempotent with existing Auth/RBAC seed flow.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present in the repo; product/engineering guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
