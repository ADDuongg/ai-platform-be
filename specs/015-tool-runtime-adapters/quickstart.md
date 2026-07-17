# Quickstart: Tool Runtime Adapters

**Feature**: `015-tool-runtime-adapters` | **Date**: 2026-07-16

Validates free/local live tools with pre-step enrichment on a Kids Fashion Agent that already has `web-search` in `toolRefs`.

## Prerequisites

- Platform DB migrated + seeded (`pnpm migration:run && pnpm seed`)
- Ollama running with a chat model (same as Card 1)
- Outbound network allowed for DuckDuckGo-style search and optional browser fetch
- No Google CSE / Browserless / Flux / AWS credentials required for MVP

## Configuration

```bash
# .env
AGENT_RUNNER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2

TOOL_RUNTIME=live
TOOL_STORAGE_ROOT=.data/tool-storage
# TOOL_RESULT_MAX_BYTES=262144

# Future paid (commented — do not enable in MVP):
# GOOGLE_CSE_API_KEY=
# GOOGLE_CSE_CX=
# BROWSERLESS_URL=
# BROWSERLESS_TOKEN=
# FLUX_API_KEY=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
# AWS_REGION=
```

CI / default safe mode:

```bash
AGENT_RUNNER=stub
TOOL_RUNTIME=stub
```

## Demo path — Trend Research + web-search

1. Start API (`pnpm start:dev` or project equivalent).
2. Login as a user with `workflows:execute`.
3. Start published Workflow `kids-fashion-trend-research` with valid required inputs (season/category/market per existing quickstart 008/014).
4. Wait until Execution `completed` (or inspect failing step errors).

### Expected

- Live LLM runner used (`AGENT_RUNNER=ollama`).
- Agent `fashion-trend-research` (or equivalent) has `web-search` in `toolRefs`.
- Server logs show tool enrichment JSON (debug/info) including `web-search` results **before** the LLM raw response log.
- Rendered Prompt log contains a `[Tool enrichment]` (or equivalent) block with search results.
- Shared Context research outputs are contract-valid and not identical to stub fixtures (Card 1 acceptance still holds).

### Evidence checklist

- [ ] Log line listing invoked tool codes
- [ ] Enrichment block present in rendered Prompt log
- [ ] No requirement for Google CSE keys
- [ ] With `TOOL_RUNTIME=stub`, same Workflow runs without outbound tool calls (LLM-only or stub depending on `AGENT_RUNNER`)

## Optional — filesystem object-storage

1. Keep `TOOL_RUNTIME=live` and live LLM mode.
2. Run a Workflow/Agent that includes `object-storage` in `toolRefs` (e.g. design review / image organizer path).
3. Confirm files appear under `TOOL_STORAGE_ROOT/{executionId}/...`.

## Optional — stub-live image-generation

1. Run an Agent with `image-generation` in `toolRefs`.
2. Enrichment includes `provider: "stub-live"` (or equivalent) placeholder asset — **not** a Flux API call.

## Failure drills

| Drill | Expect |
|-------|--------|
| Soft-delete / disable `web-search` Tool, keep live tools | Step fails with clear tool resolution error |
| Invalid `TOOL_RUNTIME=foo` | App fails to boot |
| `AGENT_RUNNER=stub` + `TOOL_RUNTIME=live` | No live tool HTTP; stub fixtures only |
| Unreachable search endpoint (mock/block network) | Step fails or retries then fails |

## Out of scope for this quickstart

- Enabling Google Custom Search, Browserless, Flux, or AWS S3 (commented scaffolding only)
- Function-calling / tool-call loops
- New public Tool-execute REST endpoints

## Related contracts

- [contracts/tool-runtime-adapters-api.yaml](./contracts/tool-runtime-adapters-api.yaml) — reused Execution API + env
- [contracts/types.ts](./contracts/types.ts) — enrichment / env types for consumers/docs
