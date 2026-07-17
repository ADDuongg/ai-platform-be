# Data Model: LLM Agent Runner (Ollama)

**Feature**: `014-llm-agent-runner` | **Date**: 2026-07-16

No new persistence tables. Runtime/config entities below are logical.

## AgentRunnerMode (config)

| Field | Type | Rules |
|-------|------|-------|
| `AGENT_RUNNER` | enum `stub` \| `ollama` | Required at boot via Joi; **default `stub`**; invalid → startup fail |

## OllamaConnectionConfig (config)

| Field | Type | Rules |
|-------|------|-------|
| `OLLAMA_BASE_URL` | string URI | Required when `AGENT_RUNNER=ollama`; default `http://127.0.0.1:11434` when stub (optional) |
| `OLLAMA_MODEL` | string | Default model name (e.g. `llama3.2`); required when ollama mode |
| `OLLAMA_TIMEOUT_MS` | number | Default **120000**; positive integer |

**Model resolution precedence**: Agent version `configJson.model` (or equivalent) → Prompt `modelHints.model` → `OLLAMA_MODEL`.

**Timeout resolution**: `effectiveTimeoutMs = min(OLLAMA_TIMEOUT_MS, agentVersion.timeoutMs ?? ∞, node.timeoutMs ?? ∞)`.

## AgentVersion (existing — read)

Used by live runner:

- `promptRef` (Prompt code)
- `inputSchema` / `outputSchema`
- `configJson`
- `timeoutMs` / `maxRetries`

## PromptVersion (existing — read)

- `template` and/or `messages[]`
- `variablesSchema` (required vs optional vars)
- `modelHints` (optional model/temperature)

## LiveInvokeResult (ephemeral)

| Field | Type | Rules |
|-------|------|-------|
| output | object | JSON object after parse + schema validation |
| rawResponseSize | number | Must be ≤ **1 MiB** (1_048_576 bytes) or fail |

## Shared Context (existing)

Unchanged mapping rules. Live outputs must satisfy Agent `outputSchema` and, for acceptance of Kids Fashion demo, must not be identical to stub fixtures for the same agent/input.

## Seed impact (catalog data)

- Fashion Agents (008–013): tighter `output_schema` JSON Schema documents
- Fashion Prompts: instructions requiring JSON-only responses matching those schemas
- Idempotent upsert by code; no new codes required unless a Prompt is missing (prefer update in place)

## Relationships

```text
Execution step (agentCode, agentVersion)
        │
        ▼
AgentVersion.promptRef ──► Prompt (published+enabled) ──► PromptVersion
        │
        ▼
Rendered messages + model config ──► Ollama /api/chat
        │
        ▼
Parsed JSON ──► outputSchema validate ──► applyOutputMapping → Shared Context
```
