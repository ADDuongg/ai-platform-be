# Feature Specification: Workflow Execution

**Feature Branch**: `005-workflow-execution`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Build Workflow Execution for the AI Workflow Platform after Auth, Agent Registry, Workflow Management, and Workflow Builder. Authorized users must start an Execution from a published Workflow (pinning a version), run Agent steps according to graph dependencies with shared context, observe status and step history, cancel in-flight runs, and retry failed runs. Execution snapshots the Workflow definition at start so later definition edits do not change that run. Out of scope: schedule/webhook triggers, human approval/pause/resume, conditionals/loops/sub-workflows, Prompt/Tool Library CRUD, real tool adapters, and hot-edit of running executions. MVP Agent invocation may use a deterministic stub/adapter sufficient to prove orchestration; Prompt/Tool libraries are not required dependencies."

## Clarifications

### Session 2026-07-14 (auto-resolved for full implement)

- Q: Start API surface? → A: Both `POST /api/v1/workflows/:id/execute` (`workflows:execute`) and `POST /api/v1/executions` (`executions:create`) share the same service rules.
- Q: Agent runner MVP? → A: Deterministic stub adapter (echo mapped input + agent metadata); interface allows later LLM swap.
- Q: Empty published graph? → A: Execution completes successfully with zero steps.
- Q: Failure policy? → A: Stop-on-failure after per-step automatic retries; no skip/fallback in MVP.
- Q: Input/output mapping? → A: Flat string-path mapping from/to shared context; empty mapping passes/merges full context/output.
- Q: Parallelism? → A: Ready-set steps run sequentially within one worker job for MVP simplicity (ready-set order still dependency-correct; parallel fan-out reserved for later). Documented as “may run without waiting on each other” meaning readiness is independent — worker may still serialize invocations.
- Q: Retry Agent eligibility? → A: Re-resolve publish/enabled at retry time; snapshot graph unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Execution from a Published Workflow (Priority: P1)

An operator, designer, admin, or super_admin with execute permission starts a run of a published Workflow, optionally selecting a published version (default: current published). They provide input data. The system creates an Execution pinned to that Workflow version, snapshots the definition and Agent version pins, initializes shared context from input and workflow variables, and begins processing asynchronously. The caller immediately receives an Execution identity and initial status without waiting for all Agents to finish. Draft-only or unpublished Workflows cannot be started. Users without execute permission are denied.

**Why this priority**: Without starting a pinned Execution, there is no run to observe, cancel, or retry; this is the core product value of the platform.

**Independent Test**: As operator, start published Workflow with input → receive Execution id in pending/running state → get Execution shows pinned version and snapshot; as viewer attempt start → forbidden; start draft-only Workflow → rejected.

**Acceptance Scenarios**:

1. **Given** a published Workflow with at least one Agent step and a user with execute permission, **When** they start an Execution with valid input, **Then** an Execution is created pinned to the published version, definition is snapshotted, and status is pending or running.
2. **Given** a published Workflow, **When** the caller omits version, **Then** the Execution uses the current published version.
3. **Given** a Workflow that is draft-only, archived, or not visible as published to the caller, **When** they attempt to start, **Then** the start is rejected.
4. **Given** a user without execute permission (e.g. viewer), **When** they attempt to start, **Then** access is denied as forbidden.
5. **Given** an unauthenticated caller, **When** they attempt to start, **Then** access is denied as unauthenticated (distinguishable from forbidden).
6. **Given** a published Workflow with an empty graph (no steps), **When** an authorized user starts an Execution, **Then** the Execution completes successfully with zero steps.

---

### User Story 2 - Observe Execution Status and Step History (Priority: P1)

An authorized reader views Executions and their step history: overall status, timestamps, errors, per-step status, attempts, mapped inputs/outputs, and durations. They can list Executions with filters (Workflow, status, starter, time range) and open a single Execution with its steps. Shared context progress is visible at a summary level appropriate for observability. This enables the product principle of Observable runs.

**Why this priority**: Observability is a core product principle; without history, operators cannot trust or debug runs.

**Independent Test**: Start a multi-step Workflow → poll Execution until terminal → list shows the run → get steps shows each Agent step with status and I/O; user without read permission → forbidden.

**Acceptance Scenarios**:

1. **Given** an existing Execution, **When** a user with Execution read permission requests it, **Then** they see status, pinned Workflow version, timestamps, and error summary if any.
2. **Given** an Execution with steps, **When** a reader lists steps, **Then** each step shows identity (node), Agent reference, status, attempt count, and available input/output/error/duration.
3. **Given** multiple Executions, **When** a reader lists with filters, **Then** only matching Executions are returned with pagination.
4. **Given** a user without Execution read permission, **When** they list or get Executions, **Then** access is denied as forbidden.

---

### User Story 3 - Run Steps by Dependency with Shared Context (Priority: P1)

Once started, the platform runs Agent steps only when all dependency predecessors have completed successfully. Independent steps may become ready without waiting on each other. Each step reads only its mapped inputs from shared context, produces output, and writes mapped outputs back into context for downstream steps. Agents do not call other Agents and do not know the next step. When all steps complete successfully, the Execution completes. When a step fails after exhausting retries, the Execution fails according to stop-on-failure policy (MVP).

**Why this priority**: Correct dependency order and context flow are what make multi-Agent Workflows meaningful; incorrect order would invalidate the platform.

**Independent Test**: Publish a graph A→B and A→C (B and C independent) → start → observe A completes before B and C start → B and C become ready independently after A → final context contains outputs from A, B, and C.

**Acceptance Scenarios**:

1. **Given** a snapshotted definition with dependencies, **When** Execution runs, **Then** a step does not start until every predecessor step has status completed.
2. **Given** two steps with no mutual dependency and shared completed predecessors, **When** both become ready, **Then** both may proceed without waiting on each other (MVP worker may serialize invocations).
3. **Given** a step with input/output mappings, **When** it completes, **Then** shared context is updated only with that step’s mapped outputs and downstream steps can read those values.
4. **Given** all steps completed successfully, **When** no ready work remains, **Then** Execution status is completed.
5. **Given** a step that fails after its allowed automatic retries, **When** stop-on-failure applies, **Then** Execution status becomes failed and remaining pending steps do not start as successful work.

---

### User Story 4 - Cancel an In-Flight Execution (Priority: P2)

An authorized user cancels an Execution that is still pending or running. The Execution and remaining pending steps become cancelled. Best-effort interruption applies to work already in flight. Completed steps and their outputs remain in history. Cancel is rejected for terminal Executions (completed/failed/cancelled).

**Why this priority**: Operators need a safe stop for runaway or mistaken runs; secondary to start/observe but required for operational control.

**Independent Test**: Start a multi-step run → cancel while running/pending → status cancelled; attempt cancel on completed → rejected; user without cancel permission → forbidden.

**Acceptance Scenarios**:

1. **Given** a pending or running Execution, **When** a user with cancel permission cancels it, **Then** Execution status is cancelled and pending steps are not completed successfully.
2. **Given** a completed, failed, or already cancelled Execution, **When** cancel is attempted, **Then** the request is rejected without changing history.
3. **Given** a user without cancel permission, **When** they attempt cancel, **Then** access is denied as forbidden.

---

### User Story 5 - Retry a Failed Execution (Priority: P2)

An authorized user retries a failed Execution. Completed steps are not re-run; failed steps are re-queued with a new attempt, preserving prior completed outputs in context. Retry is rejected for non-failed Executions. Automatic per-step retries during the original run follow each step’s retry limit before the Execution is marked failed.

**Why this priority**: Transient Agent failures should be recoverable without rebuilding the Workflow; important for operations after core run/observe works.

**Independent Test**: Force a mid-graph failure after A completed → Execution failed → retry → A not re-run → failed step attempts again → on success downstream continues; retry on completed → rejected.

**Acceptance Scenarios**:

1. **Given** a failed Execution with some completed steps and one or more failed steps, **When** a user with retry permission retries, **Then** completed steps are not re-executed and failed steps receive a new attempt.
2. **Given** a pending, running, completed, or cancelled Execution, **When** retry is attempted, **Then** the request is rejected.
3. **Given** a step configured with automatic retries, **When** it fails transiently within the retry limit, **Then** the platform retries that step before failing the Execution.
4. **Given** a user without retry permission, **When** they attempt retry, **Then** access is denied as forbidden.

---

### User Story 6 - Snapshot Isolation from Later Definition Changes (Priority: P2)

After an Execution starts, designers may change the Workflow draft or publish a new version. The in-flight or historical Execution continues to reflect the definition and Agent pins captured at start. Readers of that Execution still see the original snapshot metadata for reproducibility.

**Why this priority**: Version pin and snapshot are required by WORKFLOW_ENGINE for traceability; without them Execution history is unreliable.

**Independent Test**: Start Execution on version N → publish version N+1 with different graph → original Execution step list still matches version N snapshot.

**Acceptance Scenarios**:

1. **Given** an Execution started on Workflow version N, **When** the Workflow is later published as version N+1 with a different graph, **Then** that Execution’s snapshotted definition and step plan remain those of version N.
2. **Given** a completed Execution, **When** Agents or Workflow definitions change afterward, **Then** stored step history and outputs for that Execution remain unchanged.

---

### User Story 7 - Role-Appropriate Execution Access (Priority: P2)

Execute, read, cancel, and retry use existing Auth permissions (`workflows:execute`, `executions:create`, `executions:read`, `executions:cancel`, `executions:retry`). No new permission codes are introduced. Start may be offered via Workflow-centric and Execution-centric entry points that share the same rules. MVP does not add multi-tenant isolation beyond existing Auth.

**Why this priority**: Confirms Execution stays inside the seeded RBAC model before Phase 2 fashion workflows.

**Independent Test**: Permission matrix for start/read/cancel/retry across roles; unauthenticated vs forbidden distinguishable.

**Acceptance Scenarios**:

1. **Given** seeded roles, **When** Execution goes live, **Then** no new permission codes are required beyond existing Auth seeds.
2. **Given** a viewer, **When** they attempt start/cancel/retry, **Then** those mutating actions are forbidden while read may succeed per Auth matrix.
3. **Given** an operator, **When** they start, read, cancel, and retry within permissions, **Then** authorized actions succeed (business validation may still fail separately).

---

### Edge Cases

- Start when referenced Agents in the snapshot are later disabled → in-flight run continues on snapshotted pins; new starts re-validate current Agent publish/enabled state at start time.
- Start with invalid or oversized input → rejected with clear validation failure; no Execution created.
- Cancel during the last running step → Execution ends cancelled; that step may show cancelled or failed-interrupted consistently in history.
- Concurrent cancel and natural completion → one terminal status wins; history remains consistent (no partial corrupt status).
- Retry when Agent for a failed step is now disabled/unpublished → retry attempt fails validation or fails the step with a clear error (documented: re-resolve Agent at retry time).
- Workflow soft-deleted after Executions exist → historical Executions remain readable; new starts rejected.
- Extremely deep or wide graphs → still respect dependency rules; platform may limit concurrency but MUST NOT violate predecessor completion.
- Conditional edges, loops, human approval, pause/resume → out of scope; non-null edge conditions in snapshot MUST cause start validation failure (align Builder reject rules).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow holders of Workflow execute / Execution create permission to start an Execution from a published Workflow, optionally specifying a published version (default: current published).
- **FR-002**: System MUST reject Execution start when the Workflow is not published (or not visible as published to the caller), is archived/soft-deleted, or the requested version is not a published version.
- **FR-003**: System MUST snapshot the Workflow definition and resolve Agent version pins at start, and MUST bind the Execution to that snapshot for the lifetime of the run and its history.
- **FR-004**: System MUST initialize shared context from caller input and workflow-level variables from the snapshot before running steps.
- **FR-005**: System MUST return an Execution identity and non-blocking initial status to the starter without requiring all steps to finish first.
- **FR-006**: System MUST run a step only when every dependency predecessor step has completed successfully.
- **FR-007**: System MUST allow independent ready steps to proceed without waiting on each other (parallel readiness; MVP may serialize worker invocations).
- **FR-008**: System MUST invoke each Agent step with only its mapped inputs and MUST write only that step’s mapped outputs into shared context (Agent independence: no Agent-to-Agent calls, no knowledge of next step).
- **FR-009**: System MUST record per-step history including status, attempt, mapped input/output when available, error when failed, and timing sufficient to compute duration.
- **FR-010**: System MUST allow holders of Execution read permission to list and get Executions and their steps, including filters for Workflow, status, starter, and time range with pagination.
- **FR-011**: System MUST allow holders of Execution cancel permission to cancel pending or running Executions, transitioning them (and remaining unfinished work) to a cancelled outcome; MUST reject cancel on terminal Executions.
- **FR-012**: System MUST apply automatic per-step retries up to the step’s configured retry limit before marking the step failed.
- **FR-013**: System MUST allow holders of Execution retry permission to retry failed Executions by re-attempting failed steps without re-running completed steps; MUST reject retry on non-failed Executions.
- **FR-014**: System MUST mark Execution completed when all steps succeed (including the empty-graph case with zero steps); MUST mark Execution failed when a step fails after retries under stop-on-failure (MVP).
- **FR-015**: System MUST enforce authentication on all Execution actions and authorize using existing Auth permissions (no new permission codes).
- **FR-016**: System MUST NOT modify Workflow definitions or Agent registry records as part of Execution.
- **FR-017**: System MUST NOT implement schedule/webhook triggers, human approval, pause/resume, conditionals, loops, sub-workflows, Prompt/Tool library management, or hot-edit of running Executions in this feature.
- **FR-018**: System MUST validate Agent publish/enabled eligibility when starting (and when resolving Agents for retry attempts) so new work does not bind disabled/unpublished Agents; in-flight snapshots remain stable.
- **FR-019**: System MUST reject start when the snapshotted definition contains unsupported constructs for MVP (e.g. non-null edge conditions).

### Key Entities

- **Execution**: One run of a published Workflow version; holds status, input, shared context, definition snapshot, pinned version metadata, starter, and timestamps.
- **Execution Step**: One Agent step attempt within an Execution; holds node identity, Agent reference/version, status, attempt number, mapped I/O, error, and timing.
- **Shared Context**: The Execution-scoped data bag Agents read from and write to via mappings; persists for the life of the Execution.
- **Definition Snapshot**: Immutable copy of the Workflow graph and related config captured at start for reproducibility.
- **Workflow Version (published)**: The Management/Builder artifact that may be selected as the Execution source; not mutated by Execution.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized user can start a published two-step Workflow and see a terminal Execution status (completed or failed) with both steps recorded in history within 5 minutes in a guided smoke test (using the MVP Agent adapter).
- **SC-002**: 100% of start/cancel/retry attempts by unauthenticated callers are denied; forbidden vs unauthenticated outcomes are distinguishable in acceptance tests.
- **SC-003**: In dependency tests, 100% of observed step starts occur only after all predecessors are completed.
- **SC-004**: After definition changes publish a new Workflow version, 100% of previously started Executions retain their original snapshot step plan in acceptance checks.
- **SC-005**: Cancel on pending/running reaches a cancelled terminal state in 100% of cancel acceptance tests; cancel on terminal states is rejected in 100% of those tests.
- **SC-006**: Retry on failed Executions never re-runs already completed steps in acceptance tests.
- **SC-007**: Empty published graphs produce a completed Execution with zero steps in 100% of empty-graph start tests.
- **SC-008**: Operators (or roles with read permission) can locate a specific Execution via list filters and open step detail in under 2 minutes in a guided smoke test.

## Assumptions

- Authentication & Authorization is available with seeded permissions: `workflows:execute`, `executions:create`, `executions:read`, `executions:cancel`, `executions:retry`; role matrix matches Auth backlog (operator+ can execute; viewer read-only).
- Agent Registry and Workflow Management/Builder are available: published Workflow versions with validated graphs; Agents published + enabled for new binds.
- Start may be exposed as both a Workflow-scoped action and an Execution-collection create action sharing the same business rules.
- MVP failure policy is stop-on-failure after step retries; skip/fallback/compensation are out of scope.
- MVP Agent invocation uses a deterministic stub/adapter (or minimal adapter) sufficient to exercise orchestration and I/O mapping; full Prompt Library, Tool Library, and production LLM quality are out of scope for this feature’s acceptance.
- Edge `condition` must be absent/null (same as Builder); otherwise start validation fails.
- Retry re-resolves Agent eligibility at retry time; the original snapshot graph remains the step plan.
- Multi-tenant isolation beyond Auth is out of scope.
- `DOMAIN.md` and `ENGINEERING_GUIDE.md` are not present; guidance is taken from PRD, ROADMAP, BACKLOG, ARCHITECTURE, SYSTEM_DESIGN, and WORKFLOW_ENGINE.
- Concurrent execution capacity may be limited by platform resources; correctness of dependency ordering takes precedence over maximum parallelism.
- MVP orchestrator processes one Execution job at a time in a BullMQ worker; ready-set steps are invoked sequentially within that job while still respecting independent readiness.
