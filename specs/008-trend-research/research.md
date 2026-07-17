# Research: Trend Research Workflow

**Date**: 2026-07-15

## Decision 1: Where to store required input keys

**Choice**: `definition.policies.requiredInputs: string[]`

**Rationale**: `policies` already exists on `WorkflowDefinition`, is opaque today, and is preserved through Builder PUT. Avoids overloading `variables` (merged into execution context as defaults).

**Alternatives rejected**:
- `variables.__required` — pollutes context merge
- Hard-code Workflow code in Execution — violates clarify B
- New SQL column — unnecessary migration for MVP

## Decision 2: Blank detection

**Choice**: Required key fails if value is `undefined`, `null`, or a string whose `trim()` is `""`. Non-string empty values (e.g. `0`, `false`) are considered present.

## Decision 3: Reject timing

**Choice**: After definition validate succeeds (so we have a normalized definition) and **before** `createAndSave` / enqueue. HTTP 400 + `VALIDATION_ERROR` with `details.missing` / `details.blank`.

## Decision 4: Agent / Prompt codes

| Step | Agent code | Prompt code | capability |
|------|------------|-------------|------------|
| Research trends | `fashion-trend-research` | `fashion-trend-research-prompt` | `research` |
| Collect references | `fashion-reference-collector` | `fashion-reference-collector-prompt` | `research` |
| Generate report | `fashion-research-report` | `fashion-research-report-prompt` | `analysis` |

Tools: `fashion-trend-research` + `fashion-reference-collector` → `web-search`. Keep existing demo agents/prompts untouched.

## Decision 5: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the three Fashion Agents; default remains echo stub for all other agents.

## Decision 6: Graph

Linear: research → references → report. `policies.requiredInputs = ['season','category','market']`.
