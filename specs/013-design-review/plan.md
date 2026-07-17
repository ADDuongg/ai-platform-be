# Implementation Plan: Design Review Workflow

**Branch**: `013-design-review` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-design-review/spec.md`

## Summary

Deliver Milestone 2’s sixth (final) business Workflow — **Kids Fashion Design Review** — as **configuration + seed + stub fixtures** on Platform Foundation. No new NestJS domain module. Reuse generic `policies.requiredInputs`.

1. **Seed catalog**: three dedicated Agents, three dedicated Prompts, Tool wiring (`object-storage` on scorer), published Workflow `kids-fashion-design-review` (3-node **linear** graph).
2. **Stub agent fixtures**: structured outputs (`qualityReview` → `improvementSuggestions` → `designReviewScore` with fixture `perVariation`×2).
3. **Docs/contracts/tests**: quickstart, handoff contract types, unit tests for fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse existing catalog + execution entities

**Testing**: Jest unit — stub fixtures by agent code; required-input still covered by prior tests

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live vision/LLM adapters; reuse Auth permissions; scorer MUST wire `object-storage`; start requires presence of `generatedImages` (not min variation count)

**Scale/Scope**: One published Workflow + 3 Agents + 3 Prompts + tool wiring + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Three dedicated Agents; linear edges; quality maps `generatedImages`; suggestions maps `qualityReview`; score maps both review artifacts |
| No new Fashion domain module | Pass | Extend seeds + stub runner + tools wiring only |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque codes; catalog tools already seeded |
| Out of scope (Phase 3, live vision, HITL) | Pass | Fixtures / stub scores only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/013-design-review/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── design-review-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/executions/services/
  ├── stub-agent-runner.service.ts # design-review fixtures
  └── stub-agent-runner.service.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  ├── tools.seed.ts              # AGENT_TOOL_WIRING
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. Topology, shapes, tools, fixture `perVariation`, and context mappings resolved in clarify.
