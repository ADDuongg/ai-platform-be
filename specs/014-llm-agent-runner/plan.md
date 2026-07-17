# Implementation Plan: LLM Agent Runner (Ollama)

**Branch**: `014-llm-agent-runner` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-llm-agent-runner/spec.md`

## Summary

Phase 2.5 first feature: make Execution’s Agent invoke path **pluggable** — default **stub** fixtures unchanged for CI; optional **Ollama** live local LLM runner that resolves Agent `promptRef`, renders `{{var}}`, calls Ollama HTTP, parses/validates JSON, and returns objects for existing Shared Context mapping. No new public REST routes. No tool calling. Harden all 008–013 fashion Agent/Prompt seeds for JSON-only live runs.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing), Joi env validation, native `fetch` (no new HTTP client library), Jest

**Storage**: No new tables. Reuse `agent_versions`, `prompt_versions`, Execution Shared Context

**Testing**: Jest — stub regression; Ollama runner unit tests with mocked `fetch` (success, timeout, non-JSON, schema fail, oversize >1 MiB); config validation for `AGENT_RUNNER`

**Target Platform**: Linux/macOS server (Docker Compose local); Ollama on host or reachable URL

**Project Type**: Backend web-service — extend `modules/executions` + config + seeds; import Prompt read path

**Performance Goals**: Default LLM call timeout 120s; effective timeout = min(LLM timeout, Agent/node `timeoutMs`); response body cap 1 MiB

**Constraints**: Configuration-driven; Agent Independence; default `AGENT_RUNNER=stub`; full Prompt+response logging; no fashion/LLM REST module; no cloud providers; no Tool Runtime

**Scale/Scope**: DI token + factory; `OllamaAgentRunnerService`; prompt render helper; env keys; seed harden 008–013; quickstart; unit tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | No Workflow topology changes; runtime adapter only |
| Agent Independence | Pass | Runner loads Prompt by `promptRef`; Agents still do not call Agents |
| Domain module + Repository | Pass | Extend Executions; Prompt resolve via existing Prompts module/repos |
| Permission-based auth | Pass | Existing execute/read permissions; no new permission codes |
| Soft delete | Pass | Disabled/soft-deleted Prompts fail live step clearly |
| Out of scope | Pass | No tools, no cloud LLMs, no new public routes |

**Post–Phase 1 re-check**: Pass — contracts document env + reused Execution surfaces; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/014-llm-agent-runner/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── llm-agent-runner-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md                    # via /speckit-tasks
```

### Source Code (touched)

```text
src/common/config/env.validation.ts
.env.example
src/modules/executions/
  ├── executions.module.ts              # AGENT_RUNNER token + factory; import PromptsModule
  ├── constants/agent-runner.constants.ts
  ├── services/
  │   ├── stub-agent-runner.service.ts  # keep fixtures; export AgentRunner interface/token
  │   ├── ollama-agent-runner.service.ts
  │   ├── prompt-template.renderer.ts
  │   ├── json-output.parser.ts
  │   ├── execution-orchestrator.service.ts  # inject AgentRunner token
  │   └── *.spec.ts
src/modules/prompts/                   # internal resolve-by-code for published+enabled (if missing)
src/infrastructure/database/seeds/
  ├── agents.seed.ts                    # stricter outputSchema for fashion agents
  └── prompts.seed.ts                   # JSON-only instructions for fashion prompts
```

**Structure Decision**: Keep live runner inside `modules/executions` (Execution runtime), not a new `modules/llm` domain. Prompt catalog remains source of truth via Prompts module export/internal API.

## Complexity Tracking

> None — no constitution violations.

## Phase 0 / Phase 1 Outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [contracts/](./contracts/)
