# Quickstart: LLM Agent Runner (Ollama)

## Prerequisites

- Platform migrations + seed applied (`pnpm migration:run && pnpm seed`)
- [Ollama](https://ollama.com) installed locally
- A chat model pulled, e.g. `ollama pull llama3.2`

## Stub mode (default / CI)

Leave unset or set:

```bash
AGENT_RUNNER=stub
```

Existing Execution tests and Kids Fashion fixture demos work without Ollama.

## Live mode (Ollama today)

Architecture: `LlmAgentRunnerService` + pluggable `LlmChatProvider`.
Swap vendor later with `AGENT_RUNNER=openai|gemini` after implementing the matching provider class (no orchestrator changes).

Add to `.env`:

```bash
AGENT_RUNNER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
LLM_TIMEOUT_MS=120000
```

Restart the API + worker process so config reloads.

## Primary demo: Trend Research

1. Confirm Ollama: `curl -s http://127.0.0.1:11434/api/tags`
2. Login as user with `workflows:execute`
3. Resolve published Workflow `kids-fashion-trend-research`
4. `POST /api/v1/workflows/:id/execute` with:

```json
{
  "input": {
    "season": "SS27",
    "category": "kids-apparel",
    "market": "VN",
    "ageBand": "3-8",
    "constraints": "playful colors; school-friendly"
  }
}
```

5. Poll `GET /api/v1/executions/:id` until `completed` (allow up to several minutes on CPU)
6. Inspect Shared Context: `researchReport` (and intermediate keys) must:
   - Match Agent output contracts (required fields present)
   - **Not** be identical to stub fixture text for the same agents/inputs
7. Check application logs: full rendered Prompt and model response bodies for each live step

## Failure smoke checks

| Condition | Expected |
|-----------|----------|
| Stop Ollama, run live Execution | Step fails / retries then fails; clear error on Execution |
| Invalid `AGENT_RUNNER=foo` | Process fails at bootstrap |
| Response > 1 MiB (forced in unit test) | Step fails |

## Switch back to stub

```bash
AGENT_RUNNER=stub
```

Restart — fixtures return.

## Out of scope here

Tool calling / live search adapters → feature `015-tool-runtime-adapters`.
