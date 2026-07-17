# Feature Specification: Tool Library

**Feature Branch**: `007-tool-library`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Build Tool Library for the AI Workflow Platform after Auth, Agent Registry, and Prompt Library. Authorized admins must register and version reusable Tools (draft → published → archived), enable/disable them, and browse/filter the catalog by tool type (search, browser, image_generation, storage, http, custom). Published Tools are assignable to Agents via the existing opaque toolRefs string array with validation that each referenced Tool is published and enabled. Designers/operators/viewers may read published Tools only. Seed sample Tools for core types and wire at least one sample Agent toolRefs. Out of scope: tool runtime adapters, secret vaults with raw credentials, Tool marketplace, direct Workflow-node Tool binding, and live Search/Browser/Image/Storage integrations."

## Clarifications

### Session 2026-07-15

- Q: How should Tool version config handle plaintext secrets (e.g. apiKey, password, token)? → A: Reject create/update/publish when known secret-shaped keys appear as plaintext values; allow only non-secret metadata plus optional opaque `secretRef`.
- Q: After a Tool is created, may its tool_type change? → A: Immutable after create — type is part of Tool identity; change requires archive + new Tool.
- Q: Does the order of codes in Agent toolRefs matter? → A: Unordered unique set — order not significant; system MAY normalize; duplicates still rejected.
- Q: What is the maximum number of Tool codes allowed in one Agent toolRefs list? → A: Hard cap of 20 codes per Agent version.
- Q: Which sample Agent(s) should seed wire with toolRefs? → A: Both Research and Review — each gets ≥1 relevant seeded Tool (Research → search; Review → storage).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Browse Tools (Priority: P1)

An admin (or super_admin) creates a new Tool as a draft library entry (unique code, name, description, tool type, and optional config). Admins can list and open Tools in any non–soft-deleted status (including draft). Non-admin readers (designer, operator, viewer) see **published** Tools only in default list/get. Soft-deleted (`archived`) Tools do not appear in the default list. Designers do not create or publish Tools; they consume the published catalog when reviewing Agent tool references later.

**Why this priority**: Without a Tool catalog, Agents cannot reliably reference shared capabilities and Execution cannot later resolve stable tool codes.

**Independent Test**: As admin, create two draft Tools of different types; confirm admin can list drafts; as designer/viewer confirm drafts are hidden and only published Tools appear; confirm duplicate active code is rejected; as designer/viewer confirm create is forbidden.

**Acceptance Scenarios**:

1. **Given** an admin with permission to create Tools and an unused Tool code, **When** they register a Tool with required metadata and a valid tool type (config may be empty/minimal), **Then** a draft Tool is created and can be retrieved by id by an admin.
2. **Given** an existing active Tool code, **When** another create uses the same code, **Then** creation is rejected as a conflict.
3. **Given** multiple Tools including drafts and published, **When** an admin lists Tools, **Then** they see non–soft-deleted Tools of all statuses and can filter by status and tool type.
4. **Given** the same catalog, **When** a designer/operator/viewer lists or opens Tools, **Then** they only see/get **published** Tools (drafts are hidden), including published Tools with `enabled=false`; soft-deleted remain hidden for everyone by default.
5. **Given** a user without create permission, **When** they attempt to register a Tool, **Then** access is denied as forbidden.
6. **Given** no valid credentials, **When** any Tool Library action is attempted, **Then** access is denied as unauthenticated.
7. **Given** a non-admin reader, **When** they request a draft Tool by id directly, **Then** access is denied as not found or forbidden (drafts must not leak).
8. **Given** an archived Tool whose code was `web-search`, **When** an admin creates a new Tool with code `web-search`, **Then** creation succeeds and the new Tool is distinct from the archived row.

---

### User Story 2 - Configure Draft and Publish Immutable Version (Priority: P1)

An admin (or super_admin) updates a draft Tool’s configuration (config metadata, optional input/output schemas, optional secret reference string, timeout/retry hints). When ready, they publish the Tool so Agents can reliably reference a stable published code/version. Published version configuration cannot be edited in place; further changes require a new version.

**Why this priority**: Publish + immutability makes Tools safely reusable across Agents without silent drift of configuration that would change future Executions unexpectedly.

**Independent Test**: As admin, create draft → update config → publish → attempt in-place config edit (must fail) → create new version from published → publish new version → list versions; as designer confirm publish is forbidden.

**Acceptance Scenarios**:

1. **Given** a draft Tool, **When** an admin updates metadata or version config, **Then** changes persist on the draft and remain unpublished until publish.
2. **Given** a draft Tool with a valid tool type and acceptable config (may be empty stub for MVP sample tools), **When** an admin publishes it, **Then** status becomes published, a version number is assigned/confirmed, and the Tool is eligible for Agent assignment.
3. **Given** a published Tool version, **When** anyone attempts to change that version’s config in place, **Then** the change is rejected; config of that published version remains unchanged.
4. **Given** a published Tool, **When** an admin creates a new version, **Then** Tool status remains `published`, a new draft version exists (admin-visible only) that can be edited and later published without altering prior published versions; non-admins continue to see the current published version only.
5. **Given** a designer/operator/viewer (no publish permission), **When** they attempt to publish, **Then** access is denied as forbidden.
6. **Given** a published Tool with an in-progress draft version, **When** an authorized non-admin reader lists or opens versions, **Then** they see published versions only; the in-progress draft version is admin/super_admin only.

---

### User Story 3 - Assign Tools to Agent (Priority: P1)

An admin (or super_admin) assigns one or more published, enabled Tools to an Agent by setting the Agent version’s `toolRefs` to an array of Tool codes (or clears to empty). Assignment is rejected when any code is missing, not published, disabled, archived, or duplicated in the request. Historical Agent versions may retain stale code strings after a Tool is later disabled or archived; only **new** assignment is blocked.

**Why this priority**: Assignment closes the loop between Tool Library and Agent Registry using the opaque references already present on Agents; without validation, bad refs would break future Execution resolve.

**Independent Test**: Publish Tool → set Agent draft `toolRefs` to that code (success) → set refs including unknown/disabled/draft code (fail) → clear to `[]` (success) → duplicate codes in one request (fail); as designer confirm Agent mutate still follows Agent permissions.

**Acceptance Scenarios**:

1. **Given** a published enabled Tool and an editable Agent draft version, **When** an admin sets the Agent `toolRefs` to include that Tool code, **Then** the references are stored successfully.
2. **Given** a Tool that is draft-only, disabled, archived, or nonexistent, **When** an admin attempts to include its code in Agent `toolRefs`, **Then** the assignment is rejected with a clear validation error.
3. **Given** an Agent with tool references set, **When** an admin clears `toolRefs` to an empty list, **Then** the references become empty and the Agent remains valid.
4. **Given** an Agent whose stored tool references point to Tools that were later disabled or archived, **When** someone lists the Agent, **Then** the historical reference strings remain readable; new assignment of those codes fails until each Tool is again publishable and enabled.
5. **Given** Tool code `web-search` was archived and a new Tool with the same code is later published and enabled, **When** an Agent still holds `web-search` in `toolRefs` (or an admin assigns that code), **Then** lookup/assignment resolves to the **new active** Tool — not the archived row.
6. **Given** a request that lists the same Tool code twice in `toolRefs`, **When** an admin attempts to save, **Then** the assignment is rejected with a clear validation error.
7. **Given** a request with more than 20 Tool codes in `toolRefs`, **When** an admin attempts to save, **Then** the assignment is rejected with a clear validation error.
8. **Given** a user without Agent update permission, **When** they attempt to change an Agent tool references, **Then** access is denied as forbidden (assignment mutate uses Agent permissions).

---

### User Story 4 - Enable, Disable, and Retire Tools (Priority: P2)

Admins (or super_admins) can set `enabled=false` on a Tool so it should not be newly assigned to Agents, set `enabled=true` later, or soft-delete it to `archived` so it disappears from default catalogs while remaining recoverable for audit. Disable does **not** change lifecycle status (`draft` / `published` remain). Disabled Tools (`enabled=false`) remain readable for historical Agent references (subject to draft visibility rules).

**Why this priority**: Operational control without destroying history; secondary to create/publish/assign.

**Independent Test**: As admin, publish a Tool → disable → confirm still readable with enabled=false and new assignment blocked → enable → soft-delete to archived → confirm absent from default list and new assignment blocked; as operator/designer confirm disable/delete is forbidden.

**Acceptance Scenarios**:

1. **Given** a published or draft Tool with `enabled=true`, **When** an admin disables it, **Then** status is unchanged, `enabled` becomes false, and it is marked as not eligible for new Agent assignment; non-admin published listings still include it with `enabled=false`.
2. **Given** a Tool with `enabled=false`, **When** an admin enables it, **Then** `enabled` becomes true and it becomes eligible for new assignment again (subject to published status rules).
3. **Given** a Tool, **When** an admin soft-deletes it, **Then** status becomes `archived`, it no longer appears in default listings, and cannot be used for new assignment; historical Agent references remain as opaque strings.
4. **Given** a designer/operator/viewer, **When** they attempt disable/enable/delete, **Then** access is denied as forbidden.

---

### User Story 5 - Role-Appropriate Catalog Access (Priority: P2)

Designers, operators, and viewers can read Tool metadata and published config summaries (`tools:read`). Only `super_admin` and `admin` hold `tools:create`, `tools:update`, `tools:delete`, and `tools:publish` per the seeded Auth matrix. Designers browse published Tools for awareness; they do not mutate the Tool registry. Assigning Tools onto an Agent requires Agent update permission (admin/super_admin in the default seed).

**Why this priority**: Confirms Tool Library is gated by existing Auth+RBAC without new permission codes.

**Independent Test**: As viewer/designer/operator, list/read published succeeds and all Tool mutate actions fail; as admin/super_admin, mutate succeeds; confirm forbidden vs unauthenticated distinction.

**Acceptance Scenarios**:

1. **Given** a viewer, designer, or operator with `tools:read` only, **When** they list or open Tools, **Then** they succeed for **published** Tools only; drafts are not listed or retrievable; create/update/publish/delete/enable/disable fail as forbidden.
2. **Given** an admin or super_admin with Tool mutate permissions, **When** they perform create/update/publish/delete/enable/disable, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** seeded Auth roles, **When** Tool Library goes live, **Then** no new permission codes are required beyond the existing `tools:*` set.

---

### User Story 6 - Seeded Core Tool Types (Priority: P2)

After platform seed, the catalog includes at least one published sample Tool for each core type used in Milestone 2 planning: search, browser, image generation, and storage. At least one sample Agent’s `toolRefs` includes at least one of those sample Tool codes. Seed is idempotent and does not store live credentials.

**Why this priority**: Unblocks designers/operators exploring Fashion Workflow tooling without manual catalog setup; secondary to core registry CRUD.

**Independent Test**: Run platform seed twice; confirm four published sample Tools exist by type/code; confirm ≥1 sample Agent has non-empty valid `toolRefs`; confirm no raw API keys in seeded config.

**Acceptance Scenarios**:

1. **Given** a fresh or existing database, **When** platform seed runs, **Then** at least one published Tool exists for each of `search`, `browser`, `image_generation`, and `storage`.
2. **Given** seed has run, **When** a non-admin lists published Tools, **Then** the sample Tools are visible.
3. **Given** seed has run, **When** sample Agents are inspected, **Then** both Research and Review Agents each have `toolRefs` including at least one seeded Tool code that validates as published and enabled (Research includes the search sample; Review includes the storage sample).
4. **Given** seed has already run, **When** seed runs again, **Then** results remain idempotent (no duplicate active codes; Agent wiring unchanged or safely re-applied).

---

### Edge Cases

- Creating a new version on a published Tool does not change Tool status to `draft`; status stays `published` until archived.
- Only one in-progress draft version MAY exist per Tool at a time; attempting to create another while a draft version exists → rejected.
- Direct get of a never-published draft Tool id by non-admin → not found or forbidden (no draft leakage).
- Publish when Tool is already published and no new draft version exists → rejected (clear “already published” / no draft to publish outcome).
- Disable an already disabled Tool → idempotent success.
- Enable a Tool that is archived → rejected; restore is out of scope.
- Soft-delete sets status to `archived` (and hides from default lists); it is distinct from `enabled=false`.
- After soft-delete, creating a new Tool with the same code → allowed (code reserved only among active/non–soft-deleted entries).
- After reuse of a code, Agent `toolRefs` strings with that code resolve to the new active Tool (archived predecessor is ignored for lookup/assignment).
- Concurrent publish of the same draft version → only one succeeds; the other fails safely without corrupting version numbers.
- Retrieve Tool by code: non-admins only succeed for published (enabled or disabled readable); archived / draft codes must not leak to non-admins.
- Extremely large config/schema payloads → rejected above a documented size limit.
- Tool config MUST NOT store raw API keys/secrets in catalog fields; optional opaque `secretRef` string only. Create/update/publish MUST reject known secret-shaped keys in config (e.g. `apiKey`, `password`, `token`, and case variants) when present as plaintext values — do not strip silently.
- Assigning a Tool version pin beyond current published code (optional future pin by version number) is out of scope for MVP; assignment uses Tool `code` only.
- Invalid `tool_type` on create → rejected with clear validation error. Attempts to change `tool_type` on update → rejected.
- Empty `toolRefs` array on Agent → always allowed; null vs empty treated as clear-all for authorized updaters. Order of codes in `toolRefs` is not significant (unordered unique set). More than 20 codes → rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow admin/super_admin (holders of `tools:create`) to register a new Tool in `draft` status with unique code (among active Tools), name, description, and a valid `tool_type` (`search` | `browser` | `image_generation` | `storage` | `http` | `custom`); version config MAY be empty/minimal at create. `tool_type` MUST be immutable after create.
- **FR-002**: System MUST reject Tool registration when the code is already used by an active (non–soft-deleted) Tool.
- **FR-003**: System MUST allow users with `tools:read` to list Tools with filters for status and tool type, excluding soft-deleted Tools by default. Non-admin readers MUST only receive **published** Tools in list results (including published with `enabled=false`). Admins/super_admins MAY list all non–soft-deleted statuses including draft.
- **FR-004**: System MUST allow users with `tools:read` to retrieve a single Tool by id or by code, including current status, enabled flag, tool type, and current published/draft version summary — subject to draft visibility rules for non-admins. Non-admins MAY retrieve published Tools with `enabled=false`.
- **FR-005**: System MUST allow admin/super_admin (`tools:update`) to update draft Tool metadata (name, description) and version config; published version config MUST be immutable. Updates MUST NOT change `tool_type` or `code`.
- **FR-006**: System MUST allow admin/super_admin (`tools:publish`) to publish a draft Tool/version, producing or confirming an immutable published version.
- **FR-007**: System MUST allow admin/super_admin (`tools:update`) to create a new editable draft version from a published Tool without modifying prior published versions. Creating that draft version MUST NOT change Tool lifecycle status away from `published`. At most one in-progress draft version MAY exist per Tool.
- **FR-008**: System MUST keep the current published version as the catalog-facing version for non-admins while a parallel draft version is being edited; publishing the draft version MUST make it the new current published version immutably.
- **FR-009**: System MUST allow users with `tools:read` to list and retrieve Tool versions, including optional changelog notes. Non-admins MUST only see **published** versions; in-progress draft versions are admin/super_admin only.
- **FR-010**: System MUST enforce draft visibility: only admin/super_admin can list or get draft Tools and unpublished draft versions; designer/operator/viewer catalogs are published-only.
- **FR-011**: System MUST allow admin/super_admin (`tools:update`) to set Tool `enabled` true/false without changing lifecycle status; Tools with `enabled=false` remain listable/readable when published (including for non-admins) but MUST be treated as ineligible for new Agent assignment.
- **FR-012**: System MUST allow admin/super_admin (`tools:delete`) to soft-delete a Tool by setting status to `archived` so it is hidden from default catalogs; after archive, the same code MAY be reused by a new Tool.
- **FR-013**: System MUST model Tool lifecycle status as exactly `draft` | `published` | `archived`. Disable/enable MUST use a separate `enabled` boolean (default true), not a `disabled` status value.
- **FR-014**: System MUST enforce authentication on all Tool Library actions and authorize using existing `tools:create`, `tools:read`, `tools:update`, `tools:delete`, and `tools:publish` permissions. Designer/operator/viewer receive `tools:read` only in the default seed.
- **FR-015**: System MUST store Tool version configuration as structured config metadata, optional input/output schemas, optional opaque secret reference, and optional timeout/retry hints (hints are stored only; not executed). Config MUST NOT persist raw API keys or passwords. Create, update, and publish MUST reject payloads whose config contains known secret-shaped keys with plaintext values (e.g. `apiKey`, `password`, `token`, and case variants); silent stripping is not allowed.
- **FR-016**: System MUST validate Agent tool-reference assignment: setting a non-empty Agent `toolRefs` MUST succeed only when every code exists among **active** Tools, is `published`, `enabled=true`, and not soft-deleted; lookup MUST ignore archived rows even if they once used the same code. Duplicate codes in one `toolRefs` list MUST be rejected. At most **20** Tool codes MAY be assigned per Agent version; exceeding the cap MUST be rejected. `toolRefs` is an unordered unique set for MVP — submission order is not significant and the system MAY normalize stored order. Clearing to an empty list MUST always be allowed for authorized Agent updaters.
- **FR-017**: System MUST NOT invoke tool adapters (search, browser, image generation, storage, HTTP), execute Workflows, or call external integrations as part of this feature.
- **FR-018**: System MUST seed at least one published sample Tool for each of `search`, `browser`, `image_generation`, and `storage`, and MUST set sample Agent `toolRefs` so that **both** the Research and Review sample Agents each include at least one of those codes (Research → search Tool code; Review → storage Tool code). Seed MUST be idempotent and MUST NOT store live credentials.
- **FR-019**: System MUST treat Tool `code` as the sole assignment key for MVP (no Tool id or version pin stored on Agent). After code reuse, any consumer resolving by code (assignment validation now; Execution later) MUST bind to the current active Tool with that code.

### Key Entities

- **Tool**: A reusable capability identity with stable code, human-facing metadata, immutable `tool_type` (set at create), lifecycle status (`draft` | `published` | `archived`), `enabled` boolean (default true), and pointer to current version. Independent of any Workflow. Assigned to Agents by opaque code references in a list.
- **Tool Version**: A snapshot of configuration: config metadata, optional input/output schemas, optional secret reference, timeout/retry hints, version number, publication state (draft vs published), and changelog. Published versions are immutable. A Tool may have many published versions over time and at most one in-progress draft version while remaining `published` at the Tool level.
- **Tool Assignment**: The act of linking an Agent version’s `toolRefs` list to one or more Tool codes. Assignment does not copy Tool config into the Agent; consumers resolve config by code (and later, optionally, by version pin).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can register a draft Tool, publish it, and retrieve it by code in under 2 minutes in a guided smoke test.
- **SC-002**: 100% of Tool Library actions deny unauthenticated callers; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: After publish, attempts to mutate that version’s config fail in 100% of test cases; a new version path succeeds and leaves the prior published version unchanged.
- **SC-004**: Default Tool listings never include soft-deleted Tools in acceptance tests.
- **SC-005**: Viewer/designer/operator users can complete read-only browsing of **published** Tools only; drafts stay hidden; Tool mutate actions fail for those roles in 100% of permission matrix checks.
- **SC-006**: In acceptance tests, assigning published enabled Tool codes to an Agent succeeds; assigning draft/disabled/archived/unknown/duplicate codes fails 100% of the time; clearing `toolRefs` to empty succeeds.
- **SC-007**: After platform seed, the catalog contains at least one published sample Tool for each of search, browser, image generation, and storage visible to non-admin readers, and both Research and Review sample Agents each reference ≥1 of those Tools via `toolRefs` (Research → search; Review → storage), without manual create.

## Assumptions

- Authentication & Authorization (Auth + RBAC) is available: JWT identity, permission guards, and seeded `tools:*` permissions aligned so only admin/super_admin mutate Tools; designer/operator/viewer read only.
- Agent Registry is available with opaque `toolRefs` string array on Agent versions; Tool Library adds validation on assignment without requiring a hard database foreign key from Agents to Tools.
- Soft-delete allows code reuse after archive (align Prompt Library / Workflow Management active-code uniqueness), distinct from Agent Registry’s “code unique including soft-deleted” rule.
- After code reuse, opaque Agent `toolRefs` strings resolve to the current active Tool with that code; MVP does not store Tool id/version pins on Agents.
- Draft create may use empty/minimal config; publish does not require live credentials or non-empty config beyond valid tool type (sample tools are stubs).
- Non-admin published catalog includes `enabled=false` Tools (flag visible; assignment blocked) — align Prompt / Agent Registry.
- Platform seed MUST include ≥1 published sample Tool per `search` | `browser` | `image_generation` | `storage` and MUST wire both Research and Review sample Agents with ≥1 relevant code each (Research → search; Review → storage) — clarify 2026-07-15.
- Tool runtime adapters, secret vault products, marketplace sharing, and Execution-time invocation are out of scope; this feature is registry/catalog + assignment validation only.
- Non-admin Tool catalog visibility is published-only; draft Tools and unpublished draft versions are admin/super_admin only.
- Disable/enable is modeled solely via `enabled` boolean; lifecycle status is only `draft` | `published` | `archived`. Soft-delete uses `archived`.
- After first publish, further edits happen on a parallel draft version while Tool status stays `published`; non-admins keep seeing the current published version until the draft is published.
- Direct Workflow-node Tool binding is out of scope; Tools are consumed via Agents.
- Agent `toolRefs` is an unordered unique set capped at 20 codes per Agent version; order is not significant and MAY be normalized on save; duplicates and over-cap rejected (clarify 2026-07-15).
- `tool_type` is fixed at create and cannot be changed on update or new versions; to change type, archive and create a new Tool (clarify 2026-07-15).
- Raw secrets are out of catalog storage; optional `secretRef` is an opaque pointer only. Known plaintext secret-shaped keys in config are rejected on create/update/publish (clarify 2026-07-15).
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present in the repo; product/engineering guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- The backlog phrases “Search / Browser / Image Generation / Storage / Future Integrations” mean **tool types in the registry**, not shipping live adapters in this feature.
