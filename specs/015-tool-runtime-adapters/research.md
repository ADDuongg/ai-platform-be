# Research: Tool Runtime Adapters

**Feature**: `015-tool-runtime-adapters` | **Date**: 2026-07-16

## Decision 1: Pre-step enrichment (not function-calling)

- **Decision**: Before the LLM `chat()` call, `LlmAgentRunnerService` loads Agent `toolRefs`, invokes each via `ToolInvoker` in order, builds an enrichment block, and appends it to rendered messages (e.g. system/user appendix JSON). Single LLM call. No Ollama/OpenAI tool-call loop in MVP.
- **Rationale**: Clarified Option A; works for all `LlmChatProvider`s without vendor tool APIs; testable with mocked invoker.
- **Alternatives considered**: Function-calling loop (deferred); orchestrator-level enrichment outside runner (rejected — Prompt/tool coupling belongs with live runner).

## Decision 2: TOOL_RUNTIME env independent of AGENT_RUNNER

- **Decision**: `TOOL_RUNTIME=stub|live` (default **`stub`**). Live adapters run only when **`AGENT_RUNNER` is a live LLM mode** (`ollama|openai|gemini`) **and** `TOOL_RUNTIME=live`. If `AGENT_RUNNER=stub`, never invoke tools (spec FR-020).
- **Rationale**: CI stays offline; stub fixtures remain authoritative; avoids half-live enrichment into stub fixture outputs.
- **Alternatives considered**: Always enrich under stub (rejected — pollutes fixture demos); tools-only flag ignoring LLM mode (rejected by clarify).

## Decision 3: ToolInvoker + adapter registry by code

- **Decision**: `ToolInvoker.invokeAll(toolRefs, input, ctx)` resolves each code via Tools internal API → published+enabled+not soft-deleted → version config → adapter by **tool code** (`web-search`, …) with fallback key by `toolType` if needed. Missing adapter → throw unsupported.
- **Rationale**: Kids Fashion seeds wire concrete codes; registry keyed by code is explicit and matches catalog.
- **Alternatives considered**: Registry by `toolType` only (ambiguous if multiple tools share type).

## Decision 4: Free/local MVP providers + commented paid scaffolding

| Tool code | MVP (executed) | Future (commented only) |
|-----------|----------------|-------------------------|
| `web-search` | DuckDuckGo-style HTML/lite search via `fetch` | Google Custom Search JSON API |
| `web-browser` | `fetch` URL + strip tags / extract text | Browserless |
| `image-generation` | Stub-live placeholder asset URL/metadata | Flux cloud |
| `object-storage` | Local filesystem under `TOOL_STORAGE_ROOT` | AWS S3 |

- **Decision**: Paid paths are block comments or `/* FUTURE: ... */` stubs with clear TODOs; not registered in live registry; `.env.example` lists placeholder vars commented out.
- **Rationale**: Product selection for future providers without requiring keys/cost in MVP.
- **Alternatives considered**: Implement paid providers behind feature flags now (rejected — scope/cost); omit scaffolding (rejected — user asked to keep commented code).

## Decision 5: DuckDuckGo-style search client

- **Decision**: Use native `fetch` against a DuckDuckGo-compatible public endpoint or HTML results page with conservative parsing; return `{ query, results: [{ title, url, snippet }] }`. On parse/network failure → throw (step fail/retry). Cap serialized result at 256 KiB.
- **Rationale**: Free, no API key; acceptable brittleness for local Phase 2.5 demos; unit tests mock `fetch`.
- **Alternatives considered**: SearxNG self-host (ops burden); require Google CSE (rejected for MVP).

## Decision 6: Browser extract policy

- **Decision**: `GET` with timeout; accept `text/html` / `text/plain`; strip scripts/styles; collapse whitespace; truncate to 256 KiB with `\n...[truncated]`; reject non-http(s) URLs.
- **Rationale**: Spec size cap; SSRF-lite: only http(s), no file://; full Browserless deferred.
- **Alternatives considered**: cheerio dependency — allow if already in tree; otherwise regex/simple strip is enough for MVP.

## Decision 7: Filesystem object-storage

- **Decision**: `TOOL_STORAGE_ROOT` (default e.g. `.data/tool-storage`). Operations: put/get/list minimal shape matching seeded input/output schemas (plan: `{ key, contentBase64|text, contentType }` → `{ key, uri: file://... or local path, bytes }`). Create root on first use. Path traversal prevented (`path.resolve` must stay under root).
- **Rationale**: Clarified local filesystem MVP; no AWS SDK.
- **Alternatives considered**: In-memory only (lost on restart); real S3 now (rejected).

## Decision 8: Image stub-live

- **Decision**: Return deterministic placeholder `{ assetUrl: 'stub-live://image-generation/...', provider: 'stub-live', promptEcho }` without calling Flux. Still goes through ToolInvoker so enrichment proves the tool path.
- **Rationale**: Agents already reference the tool; paid Flux deferred.
- **Alternatives considered**: Fail unsupported (would break live-tools fashion image steps).

## Decision 9: Enrichment injection format

- **Decision**: Append a user (or system) message block:

  ```text
  [Tool enrichment]
  ```json
  { "tools": [ { "code": "web-search", "ok": true, "result": { ... } }, ... ] }
  ```
  ```

  Also `logger.debug` truncated JSON of enrichment. Optional: stash summary on invoke-local only (not required in Shared Context unless step metadata already supports it — do not invent new Execution columns).
- **Rationale**: Clarified evidence = enrichment in rendered Prompt + debug logs.
- **Alternatives considered**: Merge into `params.input.tools` only (less visible in Prompt logs).

## Decision 10: Timeout / retry composition

- **Decision**: Per tool invoke: `timeoutMs` from tool version (default 30s from seed). Retries: tool `maxRetries` with simple retry on transient fetch failures. Overall agent step still bounded by existing LLM/agent timeout; if enrichment exceeds remaining budget, fail the step.
- **Rationale**: Spec FR-006; keep simple — no BullMQ job per tool.
- **Alternatives considered**: Infinite tool time inside 120s LLM timeout only (too loose for browser).

## Decision 11: Tools internal resolve for workers

- **Decision**: Add `ToolsService.resolvePublishedByCode(code)` (or repository helper) without permission checks for Execution worker context — same pattern as `PromptsService.resolvePublishedByCode`.
- **Rationale**: BullMQ worker has no user permission set.
- **Alternatives considered**: Duplicate TypeORM queries inside executions (worse coupling).

## Open implementation notes (non-blocking)

- Export `ToolsService` already; ensure module import into `ExecutionsModule`.
- Do not delete stub LLM fixtures; tool enrichment is live-runner-only.
- Function-calling / paid provider enablement = follow-up features.
- **Follow-up (Done 2026-07-16)**: Structured LLM Output — Ollama `format: <Agent outputSchema>` (not bare `"json"`). Tool-calling **loop** remains a separate future card; enrichment stays primary.
