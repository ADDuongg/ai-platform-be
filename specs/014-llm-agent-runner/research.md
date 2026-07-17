# Research: LLM Agent Runner (Ollama)

**Feature**: `014-llm-agent-runner` | **Date**: 2026-07-16

## Decision 1: Runner selection via env + Nest DI factory

- **Decision**: `AGENT_RUNNER=stub|ollama` (default `stub`). Injection token `AGENT_RUNNER` (or `AgentRunner`) provided by factory reading `ConfigService`; `ExecutionOrchestratorService` depends on `AgentRunner` interface only.
- **Rationale**: Fail-fast Joi validation; CI stays stub; process-wide mode matches product (no per-Execution override).
- **Alternatives considered**: Per-Execution header/flag (rejected — expands API surface); always Ollama with stub fallback on error (rejected — masks failures).

## Decision 2: Provider-agnostic LlmChatProvider + LlmAgentRunnerService

- **Decision**: `LlmAgentRunnerService` owns Prompt resolve/render/parse/validate. Vendor HTTP lives behind `LlmChatProvider` (`OllamaChatProvider` now; `OpenAiChatProvider` / `GeminiChatProvider` stubs registered). `AGENT_RUNNER=stub|ollama|openai|gemini` selects stub vs live + provider registry.
- **Rationale**: Swap Gemini/OpenAI later by implementing `chat()` only — orchestrator and Shared Context mapping unchanged.
- **Alternatives considered**: Ollama-only concrete runner (rejected — not scalable); separate Nest module per vendor (unnecessary for MVP).

## Decision 3: Prompt resolve inside live runner

- **Decision**: Ollama runner loads Agent version (already available to orchestrator path) and resolves published+enabled Prompt by `promptRef` via Prompts internal API/repository. Orchestrator keeps passing mapped `input` + agent pin; may also pass `promptRef`/`timeoutMs`/`outputSchema` on invoke input if that reduces duplicate loads — either is fine if interfaces stay stable.
- **Rationale**: Spec places Prompt loading on the live runner; stub ignores Prompt.
- **Alternatives considered**: Orchestrator always loads Prompt (more coupling for stub path).

## Decision 4: JSON parse + optional markdown fence strip

- **Decision**: `JSON.parse` after trim; if fail, attempt extract first `{...}` fenced or bare object; if still fail → throw. Validate against Agent `outputSchema` when schema is non-empty / non-trivial (not `{}` accept-all). Oversize raw body > 1 MiB → throw before parse.
- **Rationale**: Local models often wrap JSON in fences; contract validation is acceptance-critical.
- **Alternatives considered**: Strict raw JSON only (too brittle); Ajv vs lightweight required-property checks — prefer existing project JSON-schema util if present, else Ajv already in tree or simple structural checks aligned with seed schemas.

## Decision 5: Timeout composition

- **Decision**: Default `OLLAMA_TIMEOUT_MS=120000`. Effective timeout = `min(OLLAMA_TIMEOUT_MS, agentVersion.timeoutMs or node timeout if present)`. Use `AbortSignal.timeout` / `AbortController` with `fetch`.
- **Rationale**: Clarified product default; respects tighter Agent timeouts.
- **Alternatives considered**: LLM timeout only; Agent timeout only.

## Decision 6: Logging

- **Decision**: Logger at info/debug logs full rendered Prompt and full model response body; never log env secrets (`JWT_*`, DB passwords, etc.).
- **Rationale**: Product clarification Option A (debug-friendly local Phase 2.5).
- **Alternatives considered**: Metadata-only (rejected by clarify).

## Decision 7: Seed hardening scope

- **Decision**: Update all fashion Agents/Prompts for Workflows 008–013: stricter `outputSchema` matching Shared Context shapes; Prompt text instructs JSON-only object matching schema keys.
- **Rationale**: Clarified Option A.
- **Alternatives considered**: Trend Research only (rejected).

## Decision 8: Non-fixture acceptance

- **Decision**: Live success = schema-valid JSON AND deep inequality vs stub fixture for same agentCode + comparable input (season/category/market defaults as stub uses).
- **Rationale**: Clarified Option A; testable in manual quickstart and optional assertion helper in tests when mocking non-fixture payloads.
- **Alternatives considered**: Metadata `_runner` marker (rejected — pollutes Shared Context).

## Open implementation notes (non-blocking)

- Export or add `PromptsService.resolvePublishedByCode(code)` (internal, no permission check) for worker context — Execution jobs lack a user permission set.
- Keep stub fashion fixtures for CI; do not delete.
- Tool calling deferred to `015-tool-runtime-adapters`.
