# Implementation Plan: Workflow Builder

**Branch**: `004-workflow-builder` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-workflow-builder/spec.md`

## Summary

Extend the Workflows domain with graph Builder APIs that mutate draft `definition_json` (nodes/edges/variables/policies). Validate Agent assignability via Agent Registry (`published` + `enabled`). Reject cycles, self-loops, orphan edges, duplicate edges. Cascade edge cleanup on node remove. Reuse existing `workflows:*` permissions and draft visibility rules from Workflow Management. No new tables. No Execution.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator / class-transformer, `@nestjs/swagger`

**Storage**: Existing `workflow_versions.definition_json` (jsonb); typed node/edge shape in application layer

**Testing**: Jest unit tests for graph ops, cycle detection, agent assignability, visibility, immutability of published

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service — extend `modules/workflows` (+ import `AgentsModule`)

**Constraints**: Repository pattern; draft-only mutation; Agent Independence (edges = deps only); no Execution/LLM; no new permission codes

**Scale/Scope**: Phase 1 Builder MVP — incremental node/edge APIs + full replace + validate

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Mutates definition_json only |
| Agent Independence | Pass | Nodes ref agents; no agent→agent calls |
| Domain module + Repository | Pass | Extend workflows; reuse repos |
| Permission-based auth | Pass | `workflows:read` / `workflows:update` |
| Soft delete | Pass | Archived workflows reject mutate |
| Out of scope (Execution) | Pass | No execute APIs |

## Project Structure

```text
src/modules/workflows/
├── types/workflow-definition.types.ts
├── services/workflow-definition.validator.ts
├── services/workflow-builder.service.ts
├── services/workflow-builder.service.spec.ts
├── controllers/workflow-builder.controller.ts
├── dto/add-workflow-node.dto.ts
├── dto/update-workflow-node.dto.ts
├── dto/add-workflow-edge.dto.ts
├── dto/replace-workflow-definition.dto.ts
├── dto/validate-workflow-definition.dto.ts
└── dto/workflow-definition-response.dto.ts
```

Also: `AgentsService.assertAssignableByCode`, error codes `WORKFLOW_INVALID_AGENT_REF`, `WORKFLOW_INVALID_GRAPH`.

**Structure Decision**: Keep Builder inside Workflows module; separate service/controller for SRP.
