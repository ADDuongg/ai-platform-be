# Feature Specification: Execution Deliverables / Artifacts

**Feature Branch**: `021-execution-artifacts`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "When an Execution completes, materialize Workflow-declared deliverables (`policies.outputs`) into durable Artifact records (and files when needed) so FE can list/render results by kind without depending on temporary vendor CDN URLs. Extensible across Workflows (image sets, text, files, etc.) — not image-only. MVP: local durable storage for blobs; cloud object storage later. Seed Kids Fashion research→image with outputs for generated looks. Reuse execution read permissions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persist Declared Text Deliverables (Priority: P1)

A designer configures a Workflow so that when a run finishes successfully, selected values from the final shared context (for example a customer email draft) are saved as durable text/json deliverables. Anyone who can view that execution can open the run and see those deliverables without digging through raw context.

**Why this priority**: Establishes the core deliverable model for non-binary outputs and proves backward-compatible declaration on Workflow definitions.

**Independent Test**: Complete a Workflow that declares one inline text/json output; confirm a deliverable exists for that run whose content matches the final context value for the declared key.

**Acceptance Scenarios**:

1. **Given** a published Workflow that declares an output with inline persistence for key `emailDraft`, **When** an Execution completes successfully with that key present in final context, **Then** a deliverable for `emailDraft` exists with content matching the context value.
2. **Given** a Workflow with no outputs declared, **When** an Execution completes successfully, **Then** the run still completes normally and no deliverables are required.
3. **Given** a completed Execution with inline deliverables, **When** a permitted user lists deliverables for that run, **Then** they see each declared key with kind and content suitable for display.

---

### User Story 2 - Persist Generated Images Beyond Temporary Vendor Links (Priority: P1)

For Workflows that produce images (for example Kids Fashion research→image), temporary vendor image links expire. After a successful run, the platform must keep copies of those images as durable deliverables so Modules / Execution detail can show them later.

**Why this priority**: Solves the current production pain: generated looks disappear when vendor CDN URLs expire.

**Independent Test**: Complete the Kids Fashion research→image Workflow (or equivalent) with declared image-set output on `rawGenerations`; confirm durable files exist for the run and listing/rendering does not require the original vendor URL to still work.

**Acceptance Scenarios**:

1. **Given** a Workflow that declares an image-set (or image) output with blob persistence for a context key containing image URLs, **When** the Execution completes successfully, **Then** durable copies of those images are stored and linked to the run’s deliverables.
2. **Given** those durable copies exist, **When** a user views deliverables after the original vendor URL would have expired, **Then** they can still access the images via the platform’s deliverables.
3. **Given** the Kids Fashion research→image Workflow seed, **When** examined after this feature, **Then** it declares the generated-looks output so completed runs produce durable artifacts for that key.

---

### User Story 3 - Browse Deliverables on Execution Detail (Priority: P1)

A viewer opens a completed Execution and sees a list of deliverables typed by kind (text, json, image, image set, file, url) so the UI can render appropriately without hardcoding a single Workflow.

**Why this priority**: Without a readable list API/surface, persisted artifacts do not reach users.

**Independent Test**: For a completed run with at least one deliverable, a user with execution-read permission retrieves the list; a user without that permission cannot.

**Acceptance Scenarios**:

1. **Given** a completed Execution with deliverables, **When** a user with permission to view executions lists deliverables for that id, **Then** they receive all deliverables for that run with key, kind, label (if any), and enough data to render or download.
2. **Given** a user without execution-read permission, **When** they attempt to list deliverables, **Then** access is denied.
3. **Given** deliverables of different kinds, **When** listed, **Then** kind is explicit so clients can choose text vs image vs file presentation.

---

### User Story 4 - Partial Materialization Failures Do Not Undo a Successful Run (Priority: P2)

If collecting or copying a deliverable fails (missing context key, download failure, empty image set), the Execution that already completed successfully remains completed. Failures are visible (recorded/logged) rather than silently ignored or flipping the run to failed.

**Why this priority**: Protects the primary run outcome while still making deliverable issues diagnosable.

**Independent Test**: Force a blob download failure for one declared output on an otherwise successful run; confirm execution status stays completed and the failure is observable on the deliverable or audit/log trail.

**Acceptance Scenarios**:

1. **Given** a successful Execution whose context lacks a declared output key, **When** materialization runs, **Then** Execution stays completed and the missing deliverable is reported as failed/skipped (not silent success).
2. **Given** a declared blob/image output whose source URL cannot be fetched, **When** materialization runs, **Then** Execution stays completed and the failure is recorded for that deliverable.

---

### Edge Cases

- Declared output key present but null / empty → treat as materialization failure or empty deliverable per kind rules; do not crash the run.
- `image_set` with mixed valid and invalid URLs → persist successful items; record failure for bad items (or whole key — see Assumptions).
- Workflow declares outputs but Execution ends in failed/cancelled → no materialization of deliverables for MVP (only on successful completion).
- Duplicate keys in `outputs` declaration → reject at definition validation if already supported, otherwise last-wins or fail materialization for that key once (Assumption: one deliverable per key per run).
- Very large inline payloads → prefer blob persistence for binary; inline is for small text/json (Assumption: no hard size UI for MVP beyond existing platform limits).
- Re-running materialization / re-complete → MVP creates artifacts once at completion; no soft-delete/versioning of artifacts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Workflow definitions MUST allow declaring zero or more deliverable outputs (key, kind, optional label, persistence mode) under Workflow policies without requiring a new Workflow type per business case.
- **FR-002**: Supported kinds for MVP MUST include at least: text, json, image, image_set, file, and url.
- **FR-003**: Persistence mode MUST support inline (content stored with the deliverable record) and blob (bytes stored in platform durable storage referenced by the deliverable).
- **FR-004**: When an Execution reaches successful completion, the system MUST materialize each declared output from the final shared context into durable Artifact records for that Execution.
- **FR-005**: For blob / image / image_set outputs that reference temporary external URLs, the system MUST copy bytes into platform storage at materialization time so later access does not depend on those URLs remaining valid.
- **FR-006**: Users who may view an Execution MUST be able to list that Execution’s Artifacts; users without that permission MUST NOT.
- **FR-007**: Artifact list responses MUST expose kind (and related metadata) so clients can render without Workflow-specific hardcoding.
- **FR-008**: Workflows with no declared outputs MUST continue to complete successfully with zero Artifacts (backward compatible).
- **FR-009**: Materialization failures MUST NOT change a successfully completed Execution into a failed Execution; failures MUST be observable (not silently discarded).
- **FR-010**: The Kids Fashion research→image Workflow configuration MUST declare durable outputs for generated looks so seeded/demo runs exercise blob image-set materialization.
- **FR-011**: Platform blob storage for MVP MUST be durable on the deployment’s local/object-store seam, with a clear extension path to cloud object storage later (without requiring cloud upload in MVP).
- **FR-012**: Clients that need binary content MUST be able to obtain Artifact bytes or a stable platform-served access path for blob-backed Artifacts (list + download/stream as needed for Modules).

### Key Entities

- **Workflow Output Declaration**: Configuration on a Workflow definition describing which final-context keys become deliverables, their kind, label, and how to persist them.
- **Execution**: An existing run instance; Artifacts belong to one Execution and are created when that run completes successfully.
- **Artifact (Deliverable)**: A durable result of a completed Execution for one declared key — holds inline content and/or a storage reference, kind, label, and timestamps.
- **Shared Context**: The Execution’s final context from which declared keys are read at materialization time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a Workflow with one inline text/json output, 100% of successful completions produce a matching Artifact whose content equals the final context value for that key (verified in automated tests).
- **SC-002**: For Kids Fashion (or equivalent) image-set blob output, after successful completion testers can view generated images from Artifacts without using the original vendor image URL.
- **SC-003**: Users without permission to view executions cannot retrieve Artifact lists (denied in 100% of unauthorized attempts in verification).
- **SC-004**: Successful completions of Workflows with no outputs declaration remain successful and produce zero Artifacts (no regression).
- **SC-005**: When materialization of one Artifact fails, the Execution remains completed and the failure is visible to operators/testers without searching only unstructured logs (at least one structured failure signal per failed Artifact).

## Assumptions

- Materialization runs only on **successful** Execution completion (not failed/cancelled) for MVP.
- Failure mode: **best-effort** — keep Execution completed; record per-Artifact errors (preferred over failing the whole run).
- For `image_set`, each item with a usable http(s) asset URL is copied independently; items that fail are recorded without blocking successful siblings when practical.
- One Artifact per `(execution, key)`; declarations should use unique keys.
- Inline persistence is for small text/json; binary images/files use blob persistence.
- MVP storage is local/durable filesystem (or existing local object-storage adapter); cloud (e.g. S3) is design/seam only, not a ship requirement.
- Authorization reuses existing Execution view permission (no new Artifact-specific permission in MVP).
- FE Modules/Execution detail may ship in parallel or after BE; BE provides a typed contract pack for list/download.
- Automatic email/webhook delivery, Artifact versioning, soft-delete, and long-lived public CDN URLs are out of scope for MVP.
- Execution graph and context-mapping semantics are unchanged; this feature only reads final context after completion.
