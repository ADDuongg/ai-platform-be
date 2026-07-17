# Implementation Plan: Image Generation Workflow

**Branch**: `012-image-generation` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-image-generation/spec.md`

## Summary

Deliver Milestone 2’s fifth business Workflow — **Kids Fashion Image Generation** — as **configuration + seed + stub fixtures** on Platform Foundation. No new NestJS domain module. Reuse generic `policies.requiredInputs`.

1. **Seed catalog**: three dedicated Agents, three dedicated Prompts, Tool wiring (`image-generation` on generator; `object-storage` on organizer), published Workflow `kids-fashion-image-generation` (3-node **linear** graph).
2. **Stub agent fixtures**: structured outputs with exactly **2** prompts / raw generations / final variations (`imageGenPrompts` → `rawGenerations` → `generatedImages`).
3. **Docs/contracts/tests**: quickstart, handoff contract types, unit tests for fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse existing catalog + execution entities

**Testing**: Jest unit — stub fixtures by agent code; required-input still covered by 008 tests

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live image-provider adapters; reuse Auth permissions; generator MUST wire `image-generation`; organizer MUST wire `object-storage`

**Scale/Scope**: One published Workflow + 3 Agents + 3 Prompts + tool wiring + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Three dedicated Agents; linear edges; generate maps `imageGenPrompts`; organize maps `rawGenerations` |
| No new Fashion domain module | Pass | Extend seeds + stub runner + tools wiring only |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque codes; catalog tools already seeded |
| Out of scope (Design Review, live image APIs) | Pass | Fixtures / stub URLs only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/012-image-generation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── image-generation-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/executions/services/
  ├── stub-agent-runner.service.ts # image-generation fixtures
  └── stub-agent-runner.service.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  ├── tools.seed.ts              # AGENT_TOOL_WIRING
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. Topology, shapes, tools, fixture count, and context mappings resolved in clarify.
