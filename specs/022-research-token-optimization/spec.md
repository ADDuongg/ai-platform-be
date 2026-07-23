# Feature Specification: Research Pipeline & Token Optimization

**Feature Branch**: `022-research-token-optimization`  
**Created**: 2026-07-23  
**Status**: Active  
**ADR**: [docs/optimize.md](../../docs/optimize.md)

## Overview

Reduce LLM input tokens for Research by preprocessing Search Provider results in backend code before enrichment. SerpAPI is the primary provider; DuckDuckGo is the fallback. Only projected Top N items reach the Research Agent.

## User Scenarios & Testing

### User Story 1 — Compact search enrichment (Priority: P1)

As a platform operator running Kids Fashion Trend Research with live tools, I want search results capped and projected so Research LLM calls stay cheap without losing the most useful product/article signals.

**Independent Test**: Mock SerpAPI with many shopping results; invoke `web-search` with `maxInputItems=20`; assert `results.length <= 20` and payload has only projected fields + meta.

**Acceptance Criteria**:

1. Given SerpAPI returns many items, When preprocess runs, Then enrichment `results` length ≤ `maxInputItems`.
2. Given projected items, When serialized for LLM, Then no SerpAPI-only fields (`delivery`, `extensions`, `serpapi_thumbnail`, …) appear.
3. Given `meta`, When inspect response, Then `rawCount`, `selectedCount`, `provider` are present.

### User Story 2 — SerpAPI with DuckDuckGo fallback (Priority: P1)

As an operator, I want SerpAPI when configured, and automatic DuckDuckGo when the key is missing or SerpAPI fails/returns empty, so local/CI and paid paths both work.

**Independent Test**: (a) no key → DDG; (b) key + mocked SerpAPI 500 → DDG with `fallbackUsed: true`; (c) key + shopping results → `provider: serpapi`.

**Acceptance Criteria**:

1. Missing `SERPAPI_API_KEY` → DuckDuckGo path (not an error).
2. SerpAPI HTTP/empty → DuckDuckGo + `meta.fallbackUsed === true`.
3. `configJson.provider === 'duckduckgo'` forces DDG even if key is set.

### User Story 3 — Diversity-aware selection (Priority: P2)

As a fashion researcher, I do not want Top N to be only mega-brand bestsellers; ranking and bucket sampling should mix relevance, freshness, popularity, and diversity.

**Independent Test**: Fixture with Nike/Zara heavy + niche pastel/ocean titles; assert selected set includes multiple buckets when `perBucket` allows.

## Edge Cases

- Empty results from both providers → empty `results`, non-throwing meta.
- Duplicate URLs / near-duplicate titles → single item after dedupe.
- DDG organic results without rating/reviews → ranking still completes (relevance/diversity).
- `fetchLimit` capped at 100; `maxInputItems` defaults to 20; `maxResults` aliases `maxInputItems`.

## Requirements

- **FR-001**: Backend MUST run normalize → project → dedupe → rank → bucket sample before returning `web-search` results to enrichment.
- **FR-002**: SerpAPI MUST be preferred when API key is present and provider is not forced to duckduckgo.
- **FR-003**: LLM enrichment MUST receive only Top N projected items + compact meta (never full provider JSON).
- **FR-004**: `results[]` MUST remain readable by existing `trend-evidence` (`title`, `url`, `snippet`).
- **FR-005**: No new public REST routes for this feature.
- **FR-006**: CI MUST remain offline-safe without SerpAPI credentials.

## Out of Scope

- Hard token counting (tiktoken)
- Mid-run raw artifact persistence
- Embedding / clustering / vector DB
- Analysis prompt changes

## Success Criteria

- Unit tests green for preprocess + adapter SerpAPI/DDG paths
- Seed documents SerpAPI-first `configJson`
- Documented quickstart with `SERPAPI_API_KEY` + `TOOL_RUNTIME=live`
