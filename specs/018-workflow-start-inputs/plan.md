# Implementation Plan: Workflow Start Inputs + Builder I/O Mapping (FE-led)

**Branch**: `018-workflow-start-inputs` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-workflow-start-inputs/spec.md`

## Summary

Publish a complete FE contract pack for dynamic Workflow start inputs (`policies.requiredInputs` + optional `policies.inputSchema`) and the existing definition/publish/execute/node APIs. **No Nest runtime changes required for Phase A.1.** UI work lives in `ai-platform-fe` (Builder + Modules). Phase A.2/B are contract-documented for forward compatibility.

## Technical Context

**Language/Version**: TypeScript (contracts); NestJS APIs already shipped  
**Primary Dependencies**: Existing Workflow Builder + Workflow Management + Execution modules  
**Storage**: Existing `workflow_versions.definition_json` (jsonb `policies`)  
**Testing**: FE integration against live APIs; BE unit coverage for `requiredInputs` already exists  
**Target Platform**: HTTP `/api/v1` + FE apps  
**Project Type**: Contract + FE feature (BE docs-only for A.1)  
**Constraints**: No new Nest engine; no widget DB table; Modules must not hardcode field lists as source of truth  
**Scale/Scope**: Platform improvement for Builder + Kids Fashion Modules operators

## Constitution Check

*GATE: Pass — reuses Repository/module boundaries; no Active Record; no parallel APIs; contracts complete for FE-callable surfaces documented here.*

## Project Structure

### Documentation (this feature)

```text
specs/018-workflow-start-inputs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── workflow-start-inputs-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
└── tasks.md
```

### Source Code

```text
# BE (A.1): no required changes
# Optional later: document policies.inputSchema on WorkflowDefinition types in
#   src/modules/workflows/types/workflow-definition.types.ts (comments only)

# FE (out of this repo): Builder policies UI + Modules dynamic form
```

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|----------|------------|------------------------------|
| Contract-only BE slice | FE needs typed policies + flows; Nest already works | Invent new start-inputs CRUD |
| FE-owned widgets | Avoid BE enum churn | Server widget registry |

## Phase 0 / 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
