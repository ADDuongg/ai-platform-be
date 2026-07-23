# Quickstart: Research Token Optimization (022)

## Prerequisites

- App running with `AGENT_RUNNER` live (e.g. ollama) and `TOOL_RUNTIME=live`
- Optional: `SERPAPI_API_KEY` for SerpAPI shopping
- Seeded Workflow `kids-fashion-trend-research` with Agent `fashion-trend-research` → `web-search`

## Env

```bash
TOOL_RUNTIME=live
SERPAPI_API_KEY=your_key_here   # omit to use DuckDuckGo only
```

## Verify preprocess locally (unit)

```bash
pnpm exec jest src/modules/executions/tools/search-preprocess src/modules/executions/tools/adapters/web-search.adapter.spec.ts
```

## Live smoke

1. Start Execution on `kids-fashion-trend-research` with season/category/market.
2. Inspect agent runner logs for tool enrichment JSON:
   - `provider` is `serpapi` when key works
   - `meta.selectedCount` ≤ tool `maxInputItems` (seed default 20)
   - `results` entries only have projected fields (`title`, `url`, …)

## Fallback check

Unset `SERPAPI_API_KEY` (or force `configJson.provider: duckduckgo`) → enrichment `provider: duckduckgo`, still Top N after preprocess.
