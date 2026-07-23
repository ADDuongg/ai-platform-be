# Research: Builder Node I/O Mapping

**Feature**: `019-node-io-mapping`  
**Date**: 2026-07-21

## Decision 1 — Persist via existing PATCH node

- **Decision**: Primary write path = `PATCH /api/v1/workflows/{id}/nodes/{nodeId}` with `inputMapping` and/or `outputMapping`.
- **Rationale**: Already implemented in `WorkflowBuilderService.updateNode`; returns full definition envelope; matches 018 Phase B note (T015).
- **Alternatives considered**: Only PUT full definition (works but heavier); new dedicated `/mappings` resource (unnecessary duplication).

## Decision 2 — Mapping key direction (canonical)

- **Decision**: Document and UI-label as:
  - **inputMapping**: `left` = agent input key, `right` = context path string → `mappedInput[left] = getByPath(context, right)`
  - **outputMapping**: `left` = context key, `right` = agent output path → `nextContext[left] = getByPath(output, right)`
- **Rationale**: Matches `src/modules/executions/services/context-mapper.ts` and `docs/engineering/CONTEXT_MAPPING_3NODE_PIPELINE.md`.
- **Alternatives considered**: Reverse UI labels (rejected — breaks runs silently); JSONPath `$.input.*` examples from older 018 YAML (incorrect for this engine — use plain/`dot` paths).

## Decision 3 — Empty mapping semantics (UI must not redefine)

- **Decision**: Empty / missing mapping = existing engine behavior (input: pass full context copy; output: merge full output into context).
- **Rationale**: Engine already defined; FE clears to `{}` or omits consistently with PATCH merge rules (`undefined` = leave unchanged; send `{}` to clear).
- **Alternatives considered**: FE inventing “disabled mapping” flag (rejected).

## Decision 4 — MVP value types

- **Decision**: Primary UI edits string paths only. Engine still accepts non-string literals if present in data; UI need not author them.
- **Rationale**: Spec FR-008; seeds use string paths.
- **Alternatives considered**: Literal constant editor (defer).

## Decision 5 — BE Nest scope

- **Decision**: MVP BE deliverable = contract pack under `specs/019-node-io-mapping/contracts/` (+ quickstart). No migration; no orchestrator change.
- **Rationale**: APIs already enforce `workflows:update` and draft-only mutation.
- **Alternatives considered**: Server-side mapping key validation against Prompt variables (defer — nice-to-have).
