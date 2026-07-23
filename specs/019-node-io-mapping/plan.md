# Implementation Plan: Builder Node I/O Mapping (FE-led)

**Branch**: `019-node-io-mapping` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-node-io-mapping/spec.md`

## Summary

Deliver FE-facing contracts and Builder UX for editing per-node `inputMapping` / `outputMapping` on draft Workflows. **No Nest Execution engine changes.** Persist via existing `PATCH /api/v1/workflows/{id}/nodes/{nodeId}` (and optional PUT definition). Document correct path semantics (`mappedInput[left] = context[right]`, `nextContext[left] = output[right]`) matching `applyInputMapping` / `applyOutputMapping`.

## Technical Context

**Language/Version**: TypeScript (contracts); NestJS Workflow Builder APIs already shipped  
**Primary Dependencies**: Workflow Builder (`updateNode`), Workflow publish, Execution context mapper  
**Storage**: Existing `workflow_versions.definition_json` nodes (jsonb)  
**Testing**: FE integration against live APIs; optional BE smoke via existing builder unit tests  
**Target Platform**: HTTP `/api/v1` + FE Builder  
**Project Type**: Contract + FE feature (BE docs/contracts-only for MVP)  
**Constraints**: No new expression language; string path pairs; no runtime rule changes; no start-input CRUD (018 Done)  
**Scale/Scope**: Platform Builder ergonomics after 018 A.1/A.2

## Constitution Check

*GATE: Pass — reuses Workflow Builder module; no Active Record; no parallel APIs; contracts complete for FE-callable node update + definition surfaces.*

## Project Structure

### Documentation (this feature)

```text
specs/019-node-io-mapping/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── node-io-mapping-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
└── tasks.md
```

### Source Code

```text
# BE (MVP): no required Nest runtime changes
# Optional: align any misleading docs/examples that show `$.input.*` paths
#   (engine uses plain / dot paths against contextJson / agent output)

# FE (out of this repo): Builder node panel mapping editor
```

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|----------|------------|------------------------------|
| Contract-focused BE slice | FE needs typed mapping + PATCH node flow | New mapping CRUD microservice |
| String-path UI only | Matches seed + engine primary path | Visual wire canvas / expression DSL |

## Phase 0 / 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
