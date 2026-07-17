# Implementation Plan: Workflow Management

**Branch**: `003-workflow-management` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-workflow-management/spec.md`

## Summary

Deliver an independent Workflow Management catalog so designers can create, version, publish, clone, and archive Workflow definitions (metadata + definition shell). Operator/viewer see published only. Reuse Auth `workflows:*` permissions. Empty graph may be published in MVP. Graph mutation (Builder) and Execution are out of scope. Seed ≥1 published sample Workflow.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator / class-transformer, `@nestjs/swagger`

**Storage**: PostgreSQL `workflows`, `workflow_versions` (`definition_json` jsonb); soft delete via `deleted_at` + status `archived`

**Testing**: Jest unit (visibility/immutability/clone)

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service (NestJS monolith, domain module `modules/workflows`)

**Constraints**: Repository pattern; mirror Agent Registry versioning; published definition immutability; draft visibility for holders of `workflows:update`; no Execution/Builder coupling

**Scale/Scope**: Phase 1 registry MVP — CRUD + versioning + clone + archive + seed sample

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | definition_json shell only |
| Agent Independence | Pass | No agent runtime |
| Domain module + Repository | Pass | `modules/workflows` |
| Permission-based auth | Pass | `workflows:*` |
| Soft delete | Pass | archived + deleted_at |
| Out of scope (Builder/Execution) | Pass | No graph-edit or execute APIs |

## Project Structure

```text
src/modules/workflows/
├── workflows.module.ts
├── controllers/
├── services/
├── repositories/
├── entities/
├── dto/
└── enums/
```

**Structure Decision**: Mirror `modules/agents` layout and versioning pattern.
