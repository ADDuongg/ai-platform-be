# Research: Research Pipeline & Token Optimization

## Decision 1 — SerpAPI primary, DuckDuckGo fallback

**Decision**: Call SerpAPI when `SERPAPI_API_KEY` is set and `configJson.provider !== 'duckduckgo'`. On missing key, HTTP error, or empty normalized items → DuckDuckGo. Set `meta.fallbackUsed` only when SerpAPI was attempted and failed/empty.

**Rationale**: ADR prefers structured shopping JSON; DDG keeps local/CI free.

## Decision 2 — Preprocess in adapter, not LLM

**Decision**: Pure functions under `search-preprocess/`; Research Agent never performs ETL.

## Decision 3 — Ranking weights

**Decision**: `0.35 * relevance + 0.30 * freshness + 0.20 * popularity + 0.15 * diversity` (ADR §9). Missing signals default mid/zero so DDG still ranks.

## Decision 4 — Bucket sampling

**Decision**: Heuristic buckets from title keywords + brand/source; take up to `perBucket` per bucket then fill to `maxInputItems`.

## Decision 5 — Defer artifacts & hard token budget

**Decision**: Out of Slice B. Reuse execution_artifacts later for raw dumps; soft size already via `TOOL_RESULT_MAX_BYTES` + Top N.
