# Feature Specification: Platform Domain Audit Logs

**Feature Branch**: `017-domain-audit-logs`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Build a platform domain audit-log capability for the AI Workflow Platform. After Auth (which already records minimal auth events such as login/logout/password/role), authorized administrators must be able to review who changed or operated business resources across Agents, Workflows, Tools, Prompts, Executions, and LLM selection (provider/model bound on Agents). The system records append-only audit events on successful mutations and operational actions (create, update, publish, enable/disable, archive/delete, execution start/cancel/retry, LLM config changes) with actor, domain, action, resource identity, optional client metadata, and non-sensitive change summaries. Authorized readers can list and open audit events with filters (domain, action, resource, actor, time range) and pagination. Auth audit remains separate and unchanged. Out of scope: SIEM/export/retention jobs, real-time streams, auditing every execution step tick or LLM token payloads, merging historical auth audit into domain audit, multi-tenant partitioning."

## Clarifications

### Session 2026-07-20

- Q: Audit write failure policy when business mutation already succeeded? → A: **Best-effort** — mutation remains successful; audit persistence failure is recorded in operational logs only (no rollback of the business change).
- Q: Which roles receive `audit:read` by default? → A: **`admin` and `super_admin` only** (designer / operator / viewer do not get audit read in MVP seed).
- Q: How to model LLM provider/model selection changes? → A: Record under **`agent` domain** with action **`llm_config_changed`** (no separate `llm` domain for MVP).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mutations Produce Domain Audit Events (Priority: P1)

When an authorized user successfully creates, updates, publishes, enables/disables, or archives/deletes an Agent, Workflow, Tool, or Prompt (including version create/publish where those lifecycle actions exist), the Platform records a domain audit event capturing who acted, which domain and resource were affected, what action occurred, when it occurred, and a minimal non-sensitive summary of what changed. Changing an Agent’s LLM provider/model selection is also recorded as an auditable event.

**Why this priority**: Without reliable write-side capture, there is nothing for compliance or operational review; this is the core value of the feature.

**Independent Test**: As admin, perform one create and one publish (or update) on an Agent (and optionally one other domain); then as an authorized audit reader confirm matching events exist with correct actor, domain, action, and resource identity. Confirm secrets do not appear in event summaries.

**Acceptance Scenarios**:

1. **Given** an admin with permission to create Agents and an unused Agent code, **When** they successfully create an Agent, **Then** a domain audit event exists for domain Agent with action created, the actor identity, and the Agent’s id/code.
2. **Given** a draft Agent (or other supported registry resource), **When** an admin successfully publishes it, **Then** a domain audit event records action published for that resource.
3. **Given** a published Agent whose draft/config includes LLM provider and model fields, **When** an admin successfully changes provider and/or model, **Then** a domain audit event exists with domain Agent, action `llm_config_changed`, and before/after provider and model values (or equivalent non-sensitive summary).
4. **Given** a Tool or Prompt lifecycle mutation (create, update, publish, enable, disable, archive) performed successfully by an authorized admin, **When** audit events are reviewed, **Then** at least one matching domain event exists for that resource and action.
5. **Given** a Workflow create/update/publish/archive (and draft definition save if treated as a mutation in this feature) performed successfully, **When** audit events are reviewed, **Then** a matching Workflow domain event exists.
6. **Given** any successful audited mutation, **When** the event’s summary metadata is inspected, **Then** it contains no passwords, refresh tokens, API keys, secret values, or full secret-bearing payloads.

---

### User Story 2 - Execution Operations Are Audited (Priority: P1)

When an authorized user successfully starts, cancels, or retries a Workflow Execution, the Platform records a domain audit event for that operational action. Per-step status transitions inside an Execution are not required as domain audit events (Execution history already covers step-level observability).

**Why this priority**: Executions are high-impact operational actions; auditing start/cancel/retry closes the compliance gap beyond registry CRUD.

**Independent Test**: As designer/operator with execute permissions, start an Execution on a published Workflow; cancel or retry as applicable; as audit reader confirm corresponding execution audit events exist and that routine step completions did not flood the audit trail with one event per step tick.

**Acceptance Scenarios**:

1. **Given** a published Workflow and a user permitted to start Executions, **When** they successfully start an Execution, **Then** a domain audit event exists with domain Execution and action indicating started, including Execution id and Workflow identity.
2. **Given** a running or cancellable Execution, **When** an authorized user successfully cancels it, **Then** a domain audit event records the cancel action for that Execution.
3. **Given** a failed Execution eligible for retry, **When** an authorized user successfully retries it, **Then** a domain audit event records the retry action.
4. **Given** an Execution that progresses through multiple step status changes without start/cancel/retry, **When** domain audit events are listed for that Execution, **Then** the trail does not require one domain audit event per step status tick.

---

### User Story 3 - Authorized Users Browse and Filter Audit Events (Priority: P1)

An authorized audit reader lists domain audit events with filters (domain, action, resource id and/or code, actor, time range) and pagination, and can open a single event by id. Users without audit read permission cannot list or open domain audit events. Unauthenticated callers are rejected.

**Why this priority**: Capture without review UI/API delivers little product value; read access is required for the MVP outcome.

**Independent Test**: Seed or generate several events across domains; as authorized reader filter by domain and date range and open one by id; as viewer (or other role without audit read) confirm forbidden; without credentials confirm unauthenticated.

**Acceptance Scenarios**:

1. **Given** multiple domain audit events across Agents and Executions, **When** an authorized reader lists events filtered by domain Agent, **Then** only Agent-domain events are returned and pagination works for large result sets.
2. **Given** events from different actors and times, **When** an authorized reader filters by actor and a date range, **Then** only matching events are returned.
3. **Given** a known audit event id, **When** an authorized reader opens it, **Then** they see actor, domain, action, resource identity, timestamp, and non-sensitive metadata.
4. **Given** a signed-in user without audit read permission, **When** they attempt list or get, **Then** access is denied as forbidden.
5. **Given** no valid credentials, **When** list or get is attempted, **Then** access is denied as unauthenticated.
6. **Given** an unknown audit event id, **When** an authorized reader requests it, **Then** the system responds as not found.

---

### User Story 4 - Auth Audit Remains Separate (Priority: P2)

Existing authentication audit (login success/fail, logout, password change, role change, etc.) continues to work as today and is not migrated into the domain audit trail in this feature. Domain audit readers are not required to see auth events in the domain audit list.

**Why this priority**: Avoids risky merge of security and domain trails; preserves Auth feature behavior while adding the new capability.

**Independent Test**: Perform a login; confirm auth audit still records as before; confirm the domain audit list does not claim to include that login event as a domain event.

**Acceptance Scenarios**:

1. **Given** a successful login, **When** auth audit is inspected as today, **Then** the login event is still recorded under the existing auth audit capability.
2. **Given** the same login, **When** a domain audit list is queried with default filters, **Then** that login is not required to appear as a domain audit event.
3. **Given** this feature ships, **When** auth-related acceptance checks from Auth are re-run, **Then** auth audit behavior remains unchanged.

---

### User Story 5 - Business Success Is Not Blocked by Audit Write Failure (Priority: P2)

If the Platform cannot persist a domain audit event after a business mutation has otherwise succeeded, the mutation **remains successful** (best-effort audit). The failure MUST be observable in operational/application logs so operators can investigate missing events. The business change is not rolled back solely because audit write failed.

**Why this priority**: Prefer availability of registry/execution operations over hard-coupling them to the audit store; compliance accepts rare gaps with ops visibility.

**Independent Test**: Simulate audit persistence failure during an Agent update; confirm the Agent update still succeeds and an operational error is logged.

**Acceptance Scenarios**:

1. **Given** a successful Agent update whose domain audit write then fails, **When** the client observes the API outcome, **Then** the Agent update is reported successful and the Agent change is persisted.
2. **Given** the same failure, **When** operators inspect application/operational logs, **Then** they can see that the domain audit write failed (enough context to investigate: domain, action, resource id if available).

---

### Edge Cases

- Soft-deleted / archived resources: audit events already written remain queryable; archive itself produces an audit event.
- Actor missing (system/internal job if any): event MAY record a null actor with metadata noting system origin; MVP may only cover user-initiated API actions.
- High-frequency builder autosave: if draft saves are audited, rapid successive saves MUST NOT be required to store full definition payloads—only summary fields (version, changed keys, ids).
- Duplicate client retries of the same mutation: each successful server-side mutation MAY produce its own audit event (idempotency of audit is not required unless the business API is idempotent and did not apply a second change).
- LLM Catalog is read-only today: browsing the catalog alone does not create domain audit events; only binding provider/model onto an Agent (or future catalog admin mutations) does.
- Users without audit read must not learn resource existence solely through audit error messages beyond standard forbidden/not-found patterns used elsewhere on the Platform.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record an append-only domain audit event after a successful create, update, publish, enable, disable, or archive/delete of an Agent, Workflow, Tool, or Prompt (including version create/publish where those actions exist for the resource).
- **FR-002**: System MUST record a domain audit event after a successful Execution start, cancel, or retry.
- **FR-003**: System MUST NOT require domain audit events for every Execution step status transition; step-level history remains the source for that detail.
- **FR-004**: System MUST record a domain audit event with domain **Agent** and action **`llm_config_changed`** when an Agent’s LLM provider and/or model selection is successfully changed (including non-sensitive before/after provider and model in metadata when available).
- **FR-005**: Each domain audit event MUST include: domain, action, resource type, resource id, optional resource code, actor user id when available, timestamp, optional client IP and user agent when available, and optional non-sensitive metadata summary.
- **FR-006**: Domain audit metadata MUST NOT contain secrets (passwords, raw tokens, API keys, tool secret values) or other unnecessary sensitive payloads (e.g., full workflow definition dumps).
- **FR-007**: Domain audit events MUST be immutable via product APIs (no update or delete of audit rows by clients).
- **FR-008**: Authorized users MUST be able to list domain audit events with filters for domain, action, resource id and/or code, actor user id, and created-at range, plus pagination consistent with Platform list patterns.
- **FR-009**: Authorized users MUST be able to retrieve a single domain audit event by id.
- **FR-010**: Access to list/get domain audit events MUST require permission `audit:read`. Default seed MUST grant `audit:read` to **`admin` and `super_admin` only** (not designer, operator, or viewer).
- **FR-011**: Unauthenticated callers MUST receive unauthenticated; authenticated callers lacking audit read MUST receive forbidden.
- **FR-012**: Existing auth audit events (login, logout, password, role change, etc.) MUST remain available under the Auth capability and MUST NOT be migrated into the domain audit store in this feature.
- **FR-013**: Domain audit write MUST be **best-effort**: a failure to persist an audit event MUST NOT roll back or fail a business mutation that otherwise succeeded; the failure MUST be visible in operational/application logs. This policy MUST apply consistently across instrumented domains.
- **FR-014**: There MUST be no public client API to invent arbitrary audit events; only Platform business operations create them.
- **FR-015**: After Platform initialization/seed, permission `audit:read` MUST exist and be granted to `admin` and `super_admin` so admin acceptance tests can run without manual permission editing.

### Key Entities

- **Domain Audit Event**: Append-only record of a business mutation or operational action (domain, action, resource identity, actor, optional client metadata, non-sensitive summary, created time).
- **Audit Domain**: Logical area of the Platform for MVP — Agent, Workflow, Tool, Prompt, Execution (LLM selection is an Agent action, not a separate domain).
- **Audit Action**: Lifecycle or operational verb such as created, updated, published, enabled, disabled, archived, deleted, execution started/cancelled/retried, and `llm_config_changed` (exact enum finalized in planning).
- **Actor**: Platform user who performed the action when the action is user-initiated.
- **Auth Audit Event** (existing, out of mutation scope): Security-oriented auth events kept separate from domain audit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance tests, 100% of sampled successful Agent create/publish actions produce a corresponding domain audit event with matching actor and resource identity.
- **SC-002**: In acceptance tests, 100% of sampled successful Execution start actions produce a corresponding domain audit event.
- **SC-003**: An authorized audit reader can locate events for a known resource by filter in under 1 minute in normal interactive use.
- **SC-004**: 100% of sampled list/get attempts without credentials are rejected as unauthenticated; 100% of sampled attempts by signed-in users without audit read are rejected as forbidden.
- **SC-005**: In a security review sample of domain audit metadata from Agent, Tool, Prompt, Workflow, and Execution actions, 0 events contain passwords, raw refresh tokens, or API key/secret values.
- **SC-006**: Auth login audit continues to record successfully in 100% of sampled logins after this feature ships; domain audit list is not required to include those login events.
- **SC-007**: Changing Agent LLM provider/model in acceptance tests produces ≥1 auditable event reflecting the new selection in 100% of successful change attempts.

## Assumptions

- Auth+RBAC, Agent Registry, Workflow Management/Builder, Prompt Library, Tool Library, and Execution are already available; this feature instruments their successful mutation/operation paths and adds audit read APIs.
- LLM Catalog today is a read-only allowlist; auditing “LLM catalog” means auditing Agent binding of provider/model (and any future catalog admin writes would extend the same model).
- Application/diagnostic logs remain separate from domain audit; domain audit is the product compliance trail, not a replacement for log aggregation.
- Execution step history remains the detailed runtime trail; domain audit only covers start/cancel/retry at Execution level for MVP.
- Pagination and filter UX follow existing Platform list conventions (page size defaults, stable sort by newest first).
- Soft-delete/archive semantics of source domains are unchanged; audit only observes them.
- SIEM export, retention jobs, real-time streams, and multi-tenant audit partitioning are out of scope.
- DOMAIN.md and ENGINEERING_GUIDE.md are not present in this repo; product/engineering constraints are taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, and SYSTEM_DESIGN.
