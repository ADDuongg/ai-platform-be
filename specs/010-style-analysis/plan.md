# Implementation Plan: Style Analysis Workflow

**Branch**: `010-style-analysis` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-style-analysis/spec.md`

## Summary

Deliver Milestone 2’s third business Workflow — **Kids Fashion Style Analysis** — as **configuration + seed + stub fixtures** on Platform Foundation. No new NestJS domain module. Reuse generic `policies.requiredInputs` from Trend Research (008).

1. **Seed catalog**: four dedicated Agents, four dedicated Prompts, Tool refs (`web-browser` on browse-oriented Agents), published Workflow `kids-fashion-style-analysis` (4-node **linear** graph).
2. **Stub agent fixtures**: structured outputs for the four Style Analysis Agent codes so Executions complete with `colorAnalysis` / `styleAnalysis` / `patternAnalysis` / `styleReport`.
3. **Docs/contracts/tests**: quickstart, handoff contract types, unit tests for fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse existing catalog + execution entities

**Testing**: Jest unit — stub fixtures by agent code; required-input still covered by 008 tests

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live vision/CV adapters; reuse Auth permissions; metadata/structured analysis only (no binary image decode)

**Scale/Scope**: One published Workflow + 4 Agents + 4 Prompts + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Four dedicated Agents; linear edges only |
| No new Fashion domain module | Pass | Extend seeds + stub runner only |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque codes; existing validators |
| Out of scope (Design Brief, live vision) | Pass | Fixtures only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/010-style-analysis/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── style-analysis-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/executions/services/
  ├── stub-agent-runner.service.ts # style-analysis fixtures
  └── stub-agent-runner.service.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  ├── tools.seed.ts
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. No new platform primitives — `requiredInputs` already shipped in 008. Topology and context shapes resolved in clarify.
