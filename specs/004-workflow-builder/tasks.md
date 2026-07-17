# Tasks: Workflow Builder

**Input**: Design documents from `/specs/004-workflow-builder/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1–2: Setup + Foundational

- [x] T001 Add error codes `WORKFLOW_INVALID_AGENT_REF`, `WORKFLOW_INVALID_GRAPH` in `src/common/constants/error-codes.ts`
- [x] T002 Add `WorkflowNode` / `WorkflowEdge` types in `src/modules/workflows/types/workflow-definition.types.ts`; align entity `WorkflowDefinition`
- [x] T003 Add `AgentsService.assertAssignableByCode` in `src/modules/agents/services/agents.service.ts`
- [x] T004 Implement `WorkflowDefinitionValidator` in `src/modules/workflows/services/workflow-definition.validator.ts`
- [x] T005 Wire `AgentsModule` import + Builder providers in `src/modules/workflows/workflows.module.ts`

## Phase 3: US1 — Add/Remove nodes (P1)

- [x] T006 DTOs: `AddWorkflowNodeDto`, definition response DTO
- [x] T007 `WorkflowBuilderService` getDefinition + addNode + removeNode (cascade edges)
- [x] T008 Controller routes GET definition, POST/DELETE nodes
- [x] T009 Unit tests: add valid agent, reject invalid agent, remove cascades edges, no-draft 409

## Phase 4: US2 — Edges + graph rules (P1)

- [x] T010 DTO `AddWorkflowEdgeDto`
- [x] T011 Service addEdge / removeEdge with cycle/self/dup/orphan checks
- [x] T012 Controller POST/DELETE edges
- [x] T013 Unit tests: connect ok, cycle reject, self-loop reject

## Phase 5: US3 — Configure / replace (P2)

- [x] T014 DTOs update node + replace definition
- [x] T015 Service updateNode (replace agent + mappings) + replaceDefinition + variables/policies
- [x] T016 Controller PATCH node, PUT definition
- [x] T017 Unit tests: replace agent, atomic invalid replace

## Phase 6: US4–US5 — Validate + RBAC (P3/P2)

- [x] T018 Validate endpoint (dry-run)
- [x] T019 Unit tests: draft visibility for readers, published immutability
- [x] T020 Contracts + quickstart sync; BACKLOG Status → Review

## Dependencies

```text
T001–T005 → US1 (T006–T009) → US2 (T010–T013) → US3 (T014–T017) → US4/5 (T018–T020)
```
