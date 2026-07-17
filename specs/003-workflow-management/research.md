# Research: Workflow Management

**Feature**: `003-workflow-management` | **Date**: 2026-07-14

## R1 — Mirror Agent Registry versioning

**Decision**: Parallel draft version while Workflow stays `published`; at most one draft version (partial unique index).

**Rationale**: Spec + Agent Registry pattern; designers keep stable published definition while editing next version.

## R2 — Definition shell shape

**Decision**: `definition_json = { nodes: [], edges: [], variables: {}, policies: {} }`. Empty arrays allowed on publish for MVP.

**Rationale**: WORKFLOW_ENGINE structure; Builder fills nodes/edges later.

## R3 — Draft visibility signal

**Decision**: `canSeeDrafts` = holds `workflows:update` (designer/admin/super_admin). Operator/viewer = published only.

**Rationale**: Matches Auth matrix (designer mutates workflows unlike agents).

## R4 — Clone

**Decision**: `POST /workflows/:id/clone` with new `code`; copies chosen version definition into new draft Workflow v1.

**Rationale**: Spec US3; source must not be archived.

## R5 — No enabled flag

**Decision**: Lifecycle only `draft | published | archived`. No separate enabled toggle in MVP.

**Rationale**: Spec FR-012; Active/Deprecated deferred.
