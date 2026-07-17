# Feature Specification: Workflow Builder

**Feature Branch**: `004-workflow-builder`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Build Workflow Builder for the AI Workflow Platform after Auth, Agent Registry, and Workflow Management. Designers/admins must edit the draft Workflow definition graph: add/remove/replace Agent steps (nodes), connect/disconnect steps (edges), configure node I/O mappings and timeouts/retries, and configure workflow-level variables/policies. Only draft versions are mutable; published versions stay immutable. Validate Agent assignability (published + enabled), reject cycles/orphan edges/self-loops, cascade edge cleanup on node remove. Do not create/publish/archive Workflows (Management) or execute (Execution). Out of scope: conditionals/loops/human approval, full Prompt/Tool libraries, hot-edit running executions."

## Clarifications

### Session 2026-07-14 (auto-resolved for full implement)

- Q: Agent version pin? → A: `agentCode` required; optional `agentVersion` (omit = current published Agent version at assign time is not snapshotted as mandatory; store optional pin when provided)
- Q: Node identity? → A: Server generates UUID when client omits `id`; client-provided ids allowed if unique within definition
- Q: Unknown node types / edge conditions? → A: Only `type: "agent"` allowed; `condition` must be omitted or null (reject non-null)
- Q: Validate permission? → A: `workflows:read` for validating current visible definition; `workflows:update` required when submitting a proposed payload body
- Q: Management PATCH definition vs Builder? → A: Builder APIs are the supported graph-edit path with full validation; Management may still replace shell; Builder PUT/node/edge ops always fully validate

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and Remove Agent Steps on a Draft Workflow (Priority: P1)

A designer (or admin/super_admin) opens a Workflow that has an editable draft version and adds Agent steps by choosing Agents that are published and enabled. Each step becomes a node in the draft definition. They can remove a step; any connections involving that step are removed automatically. Users without update permission cannot change the graph. Operators and viewers cannot see or edit draft definitions.

**Why this priority**: Without adding/removing steps, there is no graph to configure or connect; this is the minimum Builder value over an empty Management shell.

**Independent Test**: As designer, create/ensure draft Workflow → add two valid Agents as steps → list/get definition shows both → remove one → definition no longer has that step or its connections; as operator attempt add → forbidden; as designer add disabled/unpublished Agent → rejected.

**Acceptance Scenarios**:

1. **Given** a Workflow with an editable draft version and a published enabled Agent, **When** a designer adds that Agent as a step, **Then** the draft definition includes a new step referencing that Agent and the published version (if any) is unchanged.
2. **Given** a draft definition with steps, **When** a designer removes a step, **Then** that step is gone and every connection that referenced it is gone.
3. **Given** an Agent that is missing, unpublished, or disabled, **When** a designer tries to add it as a step, **Then** the change is rejected with a clear validation failure.
4. **Given** a Workflow with only a published version and no draft version, **When** a designer attempts any graph change, **Then** the change is rejected until a new draft version is created via Workflow Management.
5. **Given** a user without Workflow update permission, **When** they attempt to add or remove a step, **Then** access is denied as forbidden.
6. **Given** an operator or viewer, **When** they request a draft definition, **Then** they cannot retrieve it (published definition only, matching Management visibility).

---

### User Story 2 - Connect Steps and Prevent Invalid Graphs (Priority: P1)

A designer connects steps so later Execution knows dependency order (step B waits for step A). They can disconnect steps. The system rejects self-connections, connections to missing steps, duplicate connections, and cycles. Valid graphs can be read back consistently.

**Why this priority**: Edges are how Workflows become more than a bag of Agents; invalid graphs would break Execution later.

**Independent Test**: As designer, add three steps → connect A→B and B→C → succeed; connect C→A → reject cycle; connect A→A → reject; remove edge → succeed; viewer cannot connect.

**Acceptance Scenarios**:

1. **Given** two existing draft steps, **When** a designer connects source → target, **Then** the draft definition stores that dependency and both steps remain editable.
2. **Given** an existing connection, **When** a designer removes it, **Then** the connection is gone and steps remain.
3. **Given** a draft graph, **When** a designer attempts a self-connection, duplicate connection, connection to a missing step, or a connection that would create a cycle, **Then** the change is rejected and the prior definition remains unchanged.
4. **Given** a viewer/operator, **When** they attempt to connect or disconnect steps, **Then** access is denied as forbidden.

---

### User Story 3 - Replace Agent and Configure Step / Workflow Settings (Priority: P2)

A designer replaces the Agent on an existing step without necessarily recreating the step identity, and configures per-step input/output mapping, timeout/retry overrides, and optional display hints. They can also update draft workflow-level variables and policies. A full replace of the draft definition is allowed when the payload passes the same validation rules as incremental edits.

**Why this priority**: Configuration and replace enable real Workflow design beyond topology; secondary to add/connect but required before useful publish for Execution.

**Independent Test**: As designer, replace Agent on a step with another valid Agent → mappings retained unless cleared → update mappings/timeout → update variables → full-replace definition with valid graph succeeds; invalid full-replace rejected atomically.

**Acceptance Scenarios**:

1. **Given** a draft step bound to Agent A, **When** a designer replaces it with published enabled Agent B, **Then** the step still exists with the same step identity and now references Agent B.
2. **Given** a draft step, **When** a designer updates input mapping, output mapping, timeout, retry, label, or position, **Then** those settings persist on the draft definition only.
3. **Given** a draft Workflow, **When** a designer updates workflow-level variables or policies, **Then** changes persist on the draft and do not alter published versions.
4. **Given** a valid full definition payload, **When** a designer replaces the entire draft definition, **Then** the draft matches that payload after the same validation rules as incremental edits.
5. **Given** an invalid full definition payload (bad Agent, cycle, orphan connection), **When** replace is attempted, **Then** the entire replace is rejected and the previous draft definition remains unchanged.

---

### User Story 4 - Validate Definition Without Saving (Priority: P3)

A designer can ask the system to validate the current draft definition (or a proposed payload) without persisting changes, to catch assignability and graph errors before publish.

**Why this priority**: Improves designer confidence; not required for MVP mutate path because each mutate already validates, but useful before publish.

**Independent Test**: As designer, submit known-invalid graph to validate → receive failures without definition change; submit valid graph → success; reader with update or appropriate read access can validate published-facing checks as documented in assumptions.

**Acceptance Scenarios**:

1. **Given** a draft definition with a known cycle or invalid Agent ref, **When** a designer runs validate, **Then** they receive a validation failure report and the stored definition is unchanged.
2. **Given** a valid draft definition, **When** a designer runs validate, **Then** they receive a success outcome.

---

### User Story 5 - Role-Appropriate Builder Access (Priority: P2)

Designers, admins, and super_admins with Workflow update permission can mutate draft graphs. Users with read-only Workflow access see published definitions only. No new permission codes are introduced beyond existing Workflow permissions from Auth.

**Why this priority**: Confirms Builder stays inside existing RBAC before Execution opens.

**Independent Test**: Permission matrix checks for add/connect/configure vs read published-only; unauthenticated → denied distinctly from forbidden.

**Acceptance Scenarios**:

1. **Given** a viewer or operator, **When** they read Workflow definitions, **Then** they only see the published definition for published Workflows; all Builder mutations fail as forbidden.
2. **Given** a designer/admin/super_admin with update permission, **When** they perform Builder mutations on a draft, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** seeded Auth roles, **When** Workflow Builder goes live, **Then** no new permission codes are required beyond existing Workflow permissions.

---

### Edge Cases

- Graph mutate when Workflow is archived → rejected.
- Graph mutate when no draft version exists → rejected with guidance to create a new version via Management.
- Concurrent edits to the same draft → last write wins or one fails safely without corrupting JSON structure; no partial node/edge write left inconsistent.
- Removing a step that is the only node → leaves empty nodes/edges arrays (valid empty draft).
- Replacing Agent with the same Agent code → allowed (no-op or refresh metadata).
- Extremely large definition payloads → rejected above the same size limit established by Workflow Management.
- Soft-deleted Agents cannot be newly assigned; existing draft refs to later-disabled Agents fail validation on next mutate/validate touching that node.
- Conditional edge expressions, loops, human-approval nodes → out of scope; reserved fields if present MUST be ignored or rejected consistently (MVP: reject unknown node types / non-empty condition if introduced).
- Publish remains a Management action; Builder does not publish. Empty graphs may still be publishable under Management MVP rules until Execution tightens them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow holders of Workflow update permission to add a step to a draft Workflow definition by selecting a published and enabled Agent.
- **FR-002**: System MUST reject adding or replacing a step Agent when the Agent does not exist, is not published, or is disabled.
- **FR-003**: System MUST allow holders of Workflow update permission to remove a step from a draft definition and MUST remove all connections that reference that step.
- **FR-004**: System MUST allow holders of Workflow update permission to replace the Agent on an existing draft step while preserving the step identity.
- **FR-005**: System MUST allow holders of Workflow update permission to create and remove directed connections between existing draft steps (dependency: target waits for source).
- **FR-006**: System MUST reject connections that are self-referential, reference missing steps, duplicate an existing connection, or introduce a cycle.
- **FR-007**: System MUST allow holders of Workflow update permission to configure draft step settings: input mapping, output mapping, timeout, retry limits, label, and optional layout position.
- **FR-008**: System MUST allow holders of Workflow update permission to update draft workflow-level variables and policies without changing published versions.
- **FR-009**: System MUST allow holders of Workflow update permission to replace the entire draft definition in one operation, applying the same validation rules as incremental edits, and MUST reject invalid payloads atomically (no partial apply).
- **FR-010**: System MUST apply all Builder mutations only to the current draft version; published version definitions MUST remain immutable.
- **FR-011**: System MUST reject Builder mutations when no draft version exists, when the Workflow is archived, or when the caller lacks Workflow update permission.
- **FR-012**: System MUST enforce authentication on all Builder actions and authorize using existing Workflow read/update permissions (no new permission codes).
- **FR-013**: System MUST enforce draft definition visibility consistent with Workflow Management: mutate roles may read draft definitions; operators/viewers may read published definitions only.
- **FR-014**: System MUST allow authorized users to validate a draft definition (or proposed definition payload) without persisting changes and return clear pass/fail results for assignability and graph rules.
- **FR-015**: System MUST NOT create, publish, clone, or archive Workflows as part of this feature (those remain Workflow Management).
- **FR-016**: System MUST NOT execute Workflows, invoke Agents/LLMs, or implement conditional branches, loops, or human-approval steps as part of this feature.

### Key Entities

- **Workflow Definition (draft)**: The editable configuration snapshot (steps, connections, variables, policies) belonging to a draft Workflow version.
- **Step (Node)**: One Agent invocation slot in the Workflow with stable identity, Agent reference, optional mappings, timeout/retry overrides, and optional display metadata.
- **Connection (Edge)**: A directed dependency between two steps; target depends on source completion.
- **Agent Reference**: A pointer to an Agent from the Agent Registry that MUST be published and enabled to be newly assigned or accepted on validate/mutate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A designer can add two Agent steps, connect them, and retrieve the updated draft definition in under 3 minutes in a guided smoke test.
- **SC-002**: 100% of Builder mutation attempts by unauthenticated callers are denied; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: 100% of tested cycle, self-connection, and invalid-Agent assignment attempts are rejected without changing the stored draft definition.
- **SC-004**: After any successful Builder mutation on a draft, the previously published version definition remains byte-for-byte unchanged in acceptance tests.
- **SC-005**: Operator/viewer users cannot mutate graphs and cannot read draft definitions in 100% of permission matrix checks for Builder.
- **SC-006**: Removing a step always leaves zero dangling connections to that step in post-condition checks.
- **SC-007**: Full definition replace either fully succeeds or fully fails; no acceptance test observes a partially applied invalid graph.

## Assumptions

- Authentication & Authorization is available with seeded Workflow permissions; designer/admin/super_admin mutate; operator/viewer read published only.
- Agent Registry is available to resolve Agent publish/enabled state for assignability checks.
- Workflow Management already provides Workflow lifecycle, versioning, empty definition shell, and immutable published versions; Builder only edits draft `definition` content.
- Execution, Prompt Library, and Tool Library are out of scope; step config may store opaque mapping/config objects for later use.
- MVP hard-rejects cycles (no conditional edges yet).
- Management publish may still allow empty graphs in MVP; Builder validates every mutate/validate operation for the rules above.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Definition size limits follow Workflow Management’s existing maximum.
