# Research: Workflow Builder

**Feature**: `004-workflow-builder` | **Date**: 2026-07-14

## Decision 1 — Extend Workflows module (not a new top-level module)

**Choice**: `WorkflowBuilderService` + `WorkflowBuilderController` inside `modules/workflows`, import `AgentsModule`.

**Rationale**: Definition lives on `workflow_versions`; Builder is a mutation surface over the same aggregate. Avoids duplicate repositories.

**Alternatives rejected**: Separate `modules/workflow-builder` package (extra indirection for one jsonb column).

## Decision 2 — Typed nodes/edges in app layer, still jsonb storage

**Choice**: `WorkflowNode` / `WorkflowEdge` TypeScript types; persist as jsonb arrays.

**Rationale**: Matches configuration-driven architecture; no migration; version snapshots remain self-contained.

## Decision 3 — Hard-reject cycles (DFS)

**Choice**: Detect cycles on every edge add and full-definition validate.

**Rationale**: Spec MVP; Execution will assume DAG. Conditional edges deferred.

## Decision 4 — Agent assignability via AgentsService

**Choice**: `AgentsService.assertAssignableByCode(code)` — published + enabled + not soft-deleted.

**Rationale**: Clean module boundary vs raw repository injection; reusable for Execution later.

## Decision 5 — Cascade delete edges on node remove

**Choice**: Filter edges where `from` or `to` equals removed node id.

**Rationale**: Spec FR-003; prevents orphan edges.

## Decision 6 — No schema migration

**Choice**: Reuse `definition_json`; tighten validation only.

**Rationale**: Shell already exists from 003.
