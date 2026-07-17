# Implementation Plan: Prompt Library

**Branch**: `006-prompt-library` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-prompt-library/spec.md`

## Summary

Deliver an independent Prompt Library catalog so Agents can reference reusable, versioned prompt content via opaque `promptRef` (Prompt `code`). Admins/super_admins register draft Prompts, version template/messages with immutable published snapshots, enable/disable via `enabled` flag, and archive via soft-delete. Non-admins see **published** Prompts only (including `enabled=false`). Mirror Agent Registry versioning (`draft` | `published` | `archived` + parallel draft version). `code` uniqueness follows Workflow Management (active/non–soft-deleted only). Validate Agent `promptRef` assignment through a Prompts read service (no SQL FK). Reuse seeded `prompts:*` permissions. No LLM/runtime rendering. Seed ≥1 published sample Prompt and wire ≥1 sample Agent `promptRef` to that code.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, class-validator / class-transformer, existing `@nestjs/swagger`

**Storage**: PostgreSQL tables `prompts`, `prompt_versions` (jsonb for `messages`, `variables_schema`, `model_hints`; text for `template`); soft delete via `deleted_at` + status `archived`; partial unique index on `code` WHERE `deleted_at IS NULL`

**Testing**: Jest unit (service/visibility/publish content rules/assignment validation) + Nest e2e permission/visibility scenarios

**Target Platform**: Linux/macOS server (Docker Compose local; Nest HTTP API)

**Project Type**: Backend web-service (NestJS monolith, domain module `modules/prompts`)

**Performance Goals**: Interactive admin CRUD under 2 minutes smoke (SC-001); list/filter suitable for catalog browsing (hundreds of Prompts in MVP)

**Constraints**: Repository pattern (no Active Record); permission checks at API boundary; loose coupling (no Execution/Builder/Tool imports); published version immutability; draft visibility admin-only; Agent assignment validates via Prompts read service only (opaque string, no SQL FK); empty content allowed on create, required on publish

**Scale/Scope**: Phase 1 registry MVP — CRUD + versioning + enable/archive + by-code resolve + Agent `promptRef` validation hook + seed sample Prompt + wire sample Agent; LLM/runtime, marketplace, Workflow-node binding, version pins out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Project constitution (`.specify/memory/constitution.md`) is still a placeholder template. Gates applied from PRD/ARCHITECTURE + repo conventions:

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven; Prompt is data not hard-coded runtime | Pass | Registry stores metadata/content only |
| Loose coupling (no FK to Agents; opaque `promptRef`) | Pass | Validation via Prompts read service |
| Domain modules + Repository pattern | Pass | New `modules/prompts` + repositories |
| Permission-based authorization | Pass | Reuse `@Permissions('prompts:*')`; already seeded |
| Soft delete | Pass | `archived` + `deleted_at`; active-code uniqueness |
| Mirror Agent Registry versioning/enabled/visibility | Pass | Parallel draft; `enabled` separate from status |
| Reuse Auth infra | Pass | No new auth stack / permission codes |
| Out of scope respected (LLM, render, marketplace, Workflow bind) | Pass | Documented in spec |

**Post–Phase 1 re-check**: Pass — data model and contracts stay within Prompts module (+ thin AgentsService validation dependency on Prompts read); FE contracts are implementation-agnostic; no Execution/Tool coupling.

## Project Structure

### Documentation (this feature)

```text
specs/006-prompt-library/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── prompts-api.yaml
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
│   ├── enums/                 # + prompt-status, prompt-version-status (or module-local)
│   └── constants/             # permissions already include prompts:*
├── infrastructure/
│   └── database/
│       ├── migrations/        # CreatePromptsTables
│       └── seeds/             # + prompts.seed; update agents.seed promptRef
├── modules/
│   ├── prompts/
│   │   ├── prompts.module.ts
│   │   ├── controllers/
│   │   ├── services/          # PromptsService + read/export for Agents
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── enums/
│   └── agents/
│       └── services/          # AgentsService validates promptRef via Prompts read
└── app.module.ts              # import PromptsModule
```

**Structure Decision**: Single NestJS monolith domain module `prompts`, mirroring `modules/agents` layout (controller → service → repository → entity). AgentsModule depends on a Prompts **read** surface (exported service method) for assignment validation only — no SQL FK and no reverse lifecycle coupling.

## Complexity Tracking

> No constitution violations requiring justification.
