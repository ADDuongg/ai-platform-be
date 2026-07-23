# Implementation Plan: Research Pipeline & Token Optimization

**Branch**: `022-research-token-optimization` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: ADR [docs/optimize.md](../../docs/optimize.md) Slice B

## Summary

Extend `web-search` so SerpAPI is primary (when `SERPAPI_API_KEY` is set) with DuckDuckGo fallback. After fetch, run a pure-code preprocess pipeline (normalize → project → dedupe → rank → bucket/TopN) and return only compact `results` + `meta` for LLM enrichment. No new public APIs; no schema migration.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js ≥ 20  
**Primary Dependencies**: NestJS, existing `fetchWithTimeout`, Jest  
**Storage**: None new  
**Testing**: Jest unit tests (mocked `fetch`; preprocess fixtures)  
**Constraints**: Offline CI without SerpAPI; keep `trend-evidence.util` compatible (`results[].url`)

## Project Structure

```text
specs/022-research-token-optimization/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md
└── contracts/
src/modules/executions/tools/
├── search-preprocess/          # NEW
└── adapters/web-search.adapter.ts
src/common/config/…             # serpapi on toolRuntime
```

## Constitution Check

| Gate | Status |
|------|--------|
| Configuration-driven | Pass — tool `configJson` + env |
| Agent Independence | Pass — preprocess inside tool adapter |
| No fashion Nest module | Pass |
| Permission-based auth | Pass — no new routes |
| Soft delete | N/A |

## Contracts gate

Internal/runtime only: `contracts/` documents env, tool config, enrichment result types. OpenAPI notes **no new FE-callable paths**.
