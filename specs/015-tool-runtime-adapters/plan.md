# Implementation Plan: Tool Runtime Adapters

**Branch**: `015-tool-runtime-adapters` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-tool-runtime-adapters/spec.md`

## Summary

Phase 2.5 second feature: make Tool Library entries **invokable at Execution time** via an internal `ToolInvoker` + adapter registry. Primary integration is **pre-step enrichment** inside the live `LlmAgentRunnerService` (invoke declared `toolRefs` in order → inject results into prompt/input → single LLM call). MVP adapters are **free/local**: DuckDuckGo-style `web-search`, native fetch/extract `web-browser`, stub-live `image-generation`, filesystem `object-storage`. Product-selected paid providers (Google Custom Search, Browserless, Flux, AWS S3) appear only as **commented scaffolding** + `.env.example` placeholders. CI stays offline-safe with `TOOL_RUNTIME=stub` (default). No new public REST routes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20

**Primary Dependencies**: NestJS 11, TypeORM 0.3, PostgreSQL, BullMQ (existing), Joi env validation, native `fetch` + `fs/promises` (no new HTTP/SDK libs for MVP paid paths), Jest

**Storage**: No new tables. Reuse `tools` / `tool_versions` (`config_json`, `secret_ref`, `timeout_ms`, `max_retries`). Filesystem root for MVP object-storage (`TOOL_STORAGE_ROOT`)

**Testing**: Jest — ToolInvoker resolve/dispatch; each adapter success/fail with mocked `fetch` / temp dir; LlmAgentRunner enrichment wiring; config validation for `TOOL_RUNTIME`; stub LLM path never invokes tools

**Target Platform**: Linux/macOS server (Docker Compose local); optional outbound network only when `TOOL_RUNTIME=live`

**Project Type**: Backend web-service — extend `modules/executions` (tools runtime subfolder) + Tools module internal resolve + config + seeds

**Performance Goals**: Per-tool result body cap **256 KiB** (truncate-with-marker); respect Tool `timeout_ms` / `max_retries` and agent/node timeout composition

**Constraints**: Configuration-driven; Agent Independence; no fashion tool module; no public tool-execute API; paid providers not executed in MVP; live tools only when live LLM runner + `TOOL_RUNTIME=live`

**Scale/Scope**: ToolInvoker port + registry; 4 MVP adapters + commented paid stubs; env/config; seed `config_json` updates; wire enrichment into `LlmAgentRunnerService`; quickstart; unit tests

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Configuration-driven Workflow = data | Pass | No Workflow topology changes; adapters behind catalog codes |
| Agent Independence | Pass | Tools invoked by runner from `toolRefs`; Agents do not call Agents |
| Domain module + Repository | Pass | Resolve via Tools repos/service export; runtime under Executions |
| Permission-based auth | Pass | No new permissions; internal Execution path only |
| Soft delete | Pass | Soft-deleted/disabled tools fail step clearly |
| Out of scope | Pass | No paid provider live calls; no new public routes; no Phase 3 |

**Post–Phase 1 re-check**: Pass — contracts document env + reused Execution surfaces + internal enrichment types; no schema migration.

## Project Structure

### Documentation (this feature)

```text
specs/015-tool-runtime-adapters/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tool-runtime-adapters-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
├── checklists/requirements.md
└── tasks.md                    # via /speckit-tasks
```

### Source Code (touched)

```text
src/common/config/env.validation.ts
src/common/config/misc.config.ts
src/common/config/config.type.ts
.env.example
src/modules/tools/
  └── services/tools.service.ts   # resolvePublishedByCode (internal, worker-safe) if missing
src/modules/executions/
  ├── executions.module.ts
  ├── constants/tool-runtime.constants.ts
  ├── tools/                      # NEW runtime adapters (not domain module)
  │   ├── tool-invoker.ts         # port + service
  │   ├── tool-adapter.ts         # interface
  │   ├── tool-registry.ts
  │   ├── adapters/
  │   │   ├── web-search.adapter.ts      # DDG live + // Google CSE commented
  │   │   ├── web-browser.adapter.ts     # fetch/extract + // Browserless commented
  │   │   ├── image-generation.adapter.ts # stub-live + // Flux commented
  │   │   └── object-storage.adapter.ts  # filesystem + // AWS S3 commented
  │   └── *.spec.ts
  └── llm/llm-agent-runner.service.ts    # pre-step enrichment when TOOL_RUNTIME=live
src/infrastructure/database/seeds/tools.seed.ts  # config_json free/local shapes
```

**Structure Decision**: Keep tool **runtime** under `modules/executions/tools` (Execution infrastructure), not a new `modules/tool-runtime` domain. Tool **catalog** remains `modules/tools`. Mirrors LLM providers living under `executions/llm`.

## Complexity Tracking

> None — no constitution violations.

## Phase 0 / Phase 1 Outputs

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [contracts/](./contracts/)
