# Implementation Plan: Agent Registry

**Branch**: `002-agent-registry` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-agent-registry/spec.md`

## Summary

Deliver an independent Agent Registry catalog so Workflow Builder can later assign reusable capabilities. Admins/super_admins register draft Agents, version configuration with immutable published snapshots, enable/disable via `enabled` flag, and archive via soft-delete. Non-admins see published Agents only. Reuse existing Auth guards (`JwtAuthGuard`, `PermissionsGuard`, `@Permissions`) and seeded `agents:*` permissions. No LLM/runtime execution in this feature. Seed ≥2 published sample Agents (Research, Review).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator / class-transformer, existing `@nestjs/swagger`

**Storage**: PostgreSQL tables `agents`, `agent_versions` (jsonb for schemas/config); soft delete via `deleted_at` + status `archived`

**Testing**: Jest unit (service/visibility rules) + Nest e2e permission/visibility scenarios

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service (NestJS monolith, domain module `modules/agents`)

**Performance Goals**: Interactive admin CRUD under 2 minutes smoke (SC-001); list/filter suitable for catalog browsing (hundreds of Agents in MVP)

**Constraints**: Repository pattern (no Active Record); permission checks at API boundary; Agent Independence (no Workflow/LLM coupling); published version immutability; draft visibility admin-only; opaque prompt/tool string refs only

**Scale/Scope**: Phase 1 registry MVP — CRUD + versioning + enable/archive + seed samples; Prompt/Tool modules, Execution, external agents out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is still a placeholder template. Gates applied from PRD/ARCHITECTURE + repo conventions:

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven; Agent is data/capability not hard-coded workflow | Pass | Registry stores metadata/config only |
| Agent Independence (no agent→agent calls, no workflow awareness) | Pass | No Execution Engine in module |
| Domain modules + Repository pattern | Pass | New `modules/agents` + repositories |
| Permission-based authorization | Pass | Reuse `@Permissions('agents:*')` |
| Soft delete | Pass | `archived` + `deleted_at` |
| Reuse Auth infra | Pass | No new auth stack |
| Out of scope respected (runtime, marketplace, webhook agents) | Pass | Documented in spec |

**Post–Phase 1 re-check**: Pass — data model and contracts stay within Agents module; FE contracts are implementation-agnostic; no Prompt/Tool FK coupling.

## Project Structure

### Documentation (this feature)

```text
specs/002-agent-registry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agents-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── common/
│   ├── enums/                 # + agent-status, capability-type, agent-version-status
│   └── constants/             # permissions already include agents:*
├── infrastructure/
│   └── database/
│       ├── migrations/        # CreateAgentsTables
│       └── seeds/             # + agents.seed (Research, Review)
├── modules/
│   └── agents/
│       ├── agents.module.ts
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── entities/
│       ├── dto/
│       └── enums/
└── app.module.ts              # import AgentsModule
```

**Structure Decision**: Single NestJS monolith domain module `agents`, mirroring `users`/`auth` layout (controller → service → repository → entity).

## Complexity Tracking

> No constitution violations requiring justification.
