# Implementation Plan: Design Brief Workflow

**Branch**: `011-design-brief` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-design-brief/spec.md`

## Summary

Deliver Milestone 2’s fourth business Workflow — **Kids Fashion Design Brief** — as **configuration + seed + stub fixtures** on Platform Foundation. No new NestJS domain module. Reuse generic `policies.requiredInputs` from Trend Research (008).

1. **Seed catalog**: two dedicated Agents, two dedicated Prompts, empty `toolRefs`, published Workflow `kids-fashion-design-brief` (2-node **linear** graph; specification maps `designBrief`).
2. **Stub agent fixtures**: structured outputs for the two Design Brief Agent codes so Executions complete with `designBrief` + `designSpecification`.
3. **Docs/contracts/tests**: quickstart, handoff contract types, unit tests for fixtures.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse existing catalog + execution entities

**Testing**: Jest unit — stub fixtures by agent code; required-input still covered by 008 tests

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live LLM/image adapters; reuse Auth permissions; MVP Agents have empty `toolRefs`

**Scale/Scope**: One published Workflow + 2 Agents + 2 Prompts + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Two dedicated Agents; linear edges only; spec maps `designBrief` |
| No new Fashion domain module | Pass | Extend seeds + stub runner only |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque prompt codes; empty toolRefs MVP |
| Out of scope (Image Gen, live LLM) | Pass | Fixtures only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/011-design-brief/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── design-brief-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/executions/services/
  ├── stub-agent-runner.service.ts # design-brief fixtures
  └── stub-agent-runner.service.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. No new platform primitives — `requiredInputs` already shipped in 008. Topology, shapes, tools, and `designBrief` mapping resolved in clarify.
