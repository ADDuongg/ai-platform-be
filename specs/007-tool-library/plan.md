# Implementation Plan: Tool Library

**Branch**: `007-tool-library` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-tool-library/spec.md`

## Summary

Deliver an independent Tool Library catalog so Agents can reference reusable, versioned tool capabilities via opaque `toolRefs` (Tool `code` strings). Admins/super_admins register draft Tools with immutable `tool_type`, version config with immutable published snapshots, enable/disable via `enabled` flag, and archive via soft-delete. Non-admins see **published** Tools only (including `enabled=false`). Mirror Prompt/Agent Registry versioning. `code` uniqueness is active-only (reuse after archive). Validate Agent `toolRefs` assignment through a Tools read service (no SQL FK): unordered unique set, max 20, reject duplicates and plaintext secret-shaped config keys. Reuse seeded `tools:*` permissions. No tool runtime adapters. Seed ≥1 published sample Tool per `search` | `browser` | `image_generation` | `storage`; wire Research → search and Review → storage.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator / class-transformer, existing `@nestjs/swagger`

**Storage**: PostgreSQL tables `tools`, `tool_versions` (jsonb for `config_json`, `input_schema`, `output_schema`; varchar for optional `secret_ref`); soft delete via `deleted_at` + status `archived`; partial unique index on `code` WHERE `deleted_at IS NULL`

**Testing**: Jest unit (service/visibility/secret rejection/assignment validation/cap) + Nest e2e permission/visibility scenarios

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service (NestJS monolith, domain module `modules/tools`)

**Performance Goals**: Interactive admin CRUD under 2 minutes smoke (SC-001); list/filter suitable for catalog browsing (hundreds of Tools in MVP)

**Constraints**: Repository pattern (no Active Record); permission checks at API boundary; loose coupling (no Execution/Builder/Prompt imports from Tools); published version immutability; draft visibility admin-only; Agent assignment validates via Tools read service only (opaque strings, no SQL FK); `tool_type` immutable after create; reject plaintext secret-shaped config keys

**Scale/Scope**: Phase 1 registry MVP — CRUD + versioning + enable/archive + by-code resolve + Agent `toolRefs` validation hook + seed sample Tools + wire Research/Review Agents; adapters/runtime, marketplace, Workflow-node binding, version pins out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is still a placeholder template. Gates applied from PRD/ARCHITECTURE + repo conventions:

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven; Tool is data not hard-coded runtime | Pass | Registry stores metadata/config only |
| Loose coupling (no FK to Agents; opaque `toolRefs`) | Pass | Validation via Tools read service |
| Domain modules + Repository pattern | Pass | New `modules/tools` + repositories |
| Permission-based authorization | Pass | Reuse `@Permissions('tools:*')`; already seeded |
| Soft delete | Pass | `archived` + `deleted_at`; active-code uniqueness |
| Mirror Agent/Prompt Registry versioning/enabled/visibility | Pass | Parallel draft; `enabled` separate from status |
| Reuse Auth infra | Pass | No new auth stack / permission codes |
| Out of scope respected (adapters, vault, marketplace, Workflow bind) | Pass | Documented in spec |
| Security: no plaintext secrets in catalog | Pass | Reject secret-shaped keys; optional opaque `secretRef` |

**Post–Phase 1 re-check**: Pass — data model and contracts stay within Tools module (+ thin AgentsService validation dependency on Tools read); FE contracts are implementation-agnostic; no Execution/Prompt coupling from Tools.

## Project Structure

### Documentation (this feature)

```text
specs/007-tool-library/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tools-api.yaml
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
│   ├── enums/                 # + tool-status, tool-version-status, tool-type (or module-local)
│   └── constants/             # permissions already include tools:*
├── infrastructure/
│   └── database/
│       ├── migrations/        # CreateToolsTables (1710000007000)
│       └── seeds/             # + tools.seed; update agents.seed toolRefs
├── modules/
│   ├── tools/
│   │   ├── tools.module.ts
│   │   ├── controllers/
│   │   ├── services/          # ToolsService + assertAssignableByCodes for Agents
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── enums/
│   └── agents/
│       └── services/          # AgentsService validates toolRefs via Tools read
└── app.module.ts              # import ToolsModule
```

**Structure Decision**: Single NestJS monolith domain module `tools`, mirroring `modules/prompts` / `modules/agents` layout. AgentsModule depends on a Tools **read** surface (exported `assertAssignableByCodes`) for assignment validation only — no SQL FK and no reverse lifecycle coupling.

## Complexity Tracking

> No constitution violations requiring justification.
