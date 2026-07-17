# Implementation Plan: Workflow Execution

**Branch**: `005-workflow-execution` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-workflow-execution/spec.md`

## Summary

Add `modules/executions` to start/run/observe/cancel/retry Workflow Executions. Pin published Workflow version, snapshot definition + agent pins, orchestrate steps by graph dependencies via BullMQ worker, use deterministic stub Agent runner for MVP, persist execution + step history. Reuse Auth permissions already seeded. No Prompt/Tool library; no Builder/Management mutations.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (`@nestjs/bullmq`), class-validator / class-transformer, `@nestjs/swagger`

**Storage**: New tables `executions`, `execution_steps` (jsonb for input/context/snapshot/I/O)

**Testing**: Jest unit tests for service + workflow-engine (ready-set, mapping, cancel/retry rules)

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service — new `modules/executions` importing `WorkflowsModule` + `AgentsModule`

**Constraints**: Repository pattern; Configuration-driven; Agent Independence; async enqueue (non-blocking start); no new permission codes; stub agent runner

**Scale/Scope**: Phase 1 Execution MVP — start, status/history, dependency orchestration, cancel, retry, snapshot isolation

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Reads published snapshot only |
| Agent Independence | Pass | Stub runner I/O only; edges = deps |
| Domain module + Repository | Pass | `modules/executions` |
| Permission-based auth | Pass | Existing executions:* / workflows:execute |
| Soft delete | Pass | Historical executions remain; new starts reject archived |
| Out of scope | Pass | No triggers/approval/conditionals/Prompt/Tool CRUD |

## Project Structure

```text
src/modules/executions/
├── executions.module.ts
├── constants/execution.constants.ts
├── enums/execution.enums.ts
├── entities/execution.entity.ts
├── entities/execution-step.entity.ts
├── repositories/executions.repository.ts
├── repositories/execution-steps.repository.ts
├── dto/...
├── services/executions.service.ts
├── services/workflow-engine.service.ts
├── services/execution-orchestrator.service.ts
├── services/stub-agent-runner.service.ts
├── services/context-mapper.ts
├── processors/execution.processor.ts
└── controllers/executions.controller.ts
    controllers/workflow-execute.controller.ts
```

Also: migration `1710000005000-CreateExecutionsTables.ts`; error codes; seed sample multi-node workflow; AppModule import.

**Structure Decision**: Separate domain module; Workflow-scoped execute route lives in ExecutionsModule to avoid circular imports with WorkflowsModule.
