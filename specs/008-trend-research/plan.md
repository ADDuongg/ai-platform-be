# Implementation Plan: Trend Research Workflow

**Branch**: `008-trend-research` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-trend-research/spec.md`

## Summary

Deliver Milestone 2’s first business Workflow — **Kids Fashion Trend Research** — as **configuration + seed + small Execution enhancements** on Platform Foundation. No new NestJS domain module.

1. **Generic required-input enforcement**: Workflow `definition.policies.requiredInputs: string[]`; Execution start rejects missing/blank keys before create/enqueue.
2. **Seed catalog**: three dedicated Agents, three dedicated Prompts, Tool refs (`web-search`), published Workflow `kids-fashion-trend-research` (3-node linear graph).
3. **Stub agent fixtures**: structured outputs for the three Fashion Agent codes so Executions complete with `trendFindings` / `references` / `researchReport`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing Execution), Jest

**Storage**: No new tables. Reuse `workflows` / `workflow_versions` / `agents` / `agent_versions` / `prompts` / `prompt_versions` / `tools` / `executions`

**Testing**: Jest unit — `assertRequiredInputs`, stub fixtures by agent code, ExecutionsService start rejection; optional seed invariant smoke

**Target Platform**: Linux/macOS server (Docker Compose local)

**Project Type**: Backend web-service (NestJS monolith) — configuration feature, not new module

**Performance Goals**: Guided smoke under 5 minutes including async wait (SC-001)

**Constraints**: Configuration-driven; no Fashion REST module; no live tool adapters/LLM required; reuse Auth permissions; Repository pattern unchanged; `policies.requiredInputs` editable via existing definition PUT only

**Scale/Scope**: One published Workflow + 3 Agents + 3 Prompts + start validation helper + stub fixtures + docs/tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | Seeded definition + catalog |
| Agent Independence | Pass | Three dedicated Agents; edges only for dependency |
| No new Fashion domain module | Pass | Extend seeds + executions + stub runner |
| Permission-based Auth reuse | Pass | Existing `workflows:execute` / `executions:*` |
| Loose coupling Tool/Prompt refs | Pass | Opaque codes; existing validators |
| Out of scope (Reference Image, live adapters) | Pass | Fixtures only |

**Post–Phase 1 re-check**: Pass — contracts document conventions; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/008-trend-research/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── trend-research-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md
```

### Source Code (touched)

```text
src/modules/workflows/types/workflow-definition.types.ts  # document policies.requiredInputs (JSDoc / comment)
src/modules/executions/services/
  ├── required-inputs.ts           # NEW: extract + assert
  ├── executions.service.ts        # call assert after definition validate
  ├── stub-agent-runner.service.ts # fashion fixtures
  └── *.spec.ts
src/infrastructure/database/seeds/
  ├── agents.seed.ts
  ├── prompts.seed.ts
  ├── tools.seed.ts
  └── workflows.seed.ts
```

## Complexity Tracking

No unjustified complexity. Generic `requiredInputs` is intentional platform improvement (clarify B) with ~30 LOC helper rather than Fashion hard-coding.
