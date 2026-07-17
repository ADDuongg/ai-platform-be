# Implementation Plan: Reference Image Workflow

**Branch**: `009-reference-image` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-reference-image/spec.md`

## Summary

Deliver Milestone 2’s second business Workflow — **Kids Fashion Reference Image** — as **configuration + seed + stub fixtures** on Platform Foundation. No new NestJS domain module. Reuse generic `policies.requiredInputs` from Trend Research (008).

1. **Seed catalog**: three dedicated Agents, three dedicated Prompts, Tool refs (`web-search`, `web-browser`), published Workflow `kids-fashion-reference-image` (3-node linear graph).
2. **Stub agent fixtures**: structured outputs for the three Reference Image Agent codes so Executions complete with `imageCandidates` / `groupedReferences` / `inspirationBoard`.
3. **Docs/contracts/tests**: quickstart, handoff contract types, unit tests for fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse existing catalog + execution entities

**Testing**: Jest unit — stub fixtures by agent code; required-input still covered by 008 tests

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live image-search adapters; reuse Auth permissions; metadata pointers only (no binary storage)

**Scale/Scope**: One published Workflow + 3 Agents + 3 Prompts + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Three dedicated Agents; edges only for dependency |
| No new Fashion domain module | Pass | Extend seeds + stub runner only |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque codes; existing validators |
| Out of scope (Style Analysis, live adapters) | Pass | Fixtures only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/009-reference-image/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── reference-image-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/executions/services/
  ├── stub-agent-runner.service.ts # reference-image fixtures
  └── stub-agent-runner.service.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  ├── tools.seed.ts
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. No new platform primitives — `requiredInputs` already shipped in 008.
