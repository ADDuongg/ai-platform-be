# Research: Style Analysis Workflow

**Date**: 2026-07-15

## Decision 1: Required inputs

**Choice**: Reuse `definition.policies.requiredInputs = ['season','category','market']` (platform convention from 008). Reference Image keys (`inspirationBoard`, `groupedReferences`, `imageCandidates`) are **optional** enrichment — Workflow runs standalone.

**Alternatives rejected**: Require `inspirationBoard` at start (breaks standalone demo / quickstart without prior run).

## Decision 2: Agent / Prompt codes

| Step | Agent code | Prompt code | capability |
|------|------------|-------------|------------|
| Color analysis | `fashion-color-analyzer` | `fashion-color-analyzer-prompt` | `analysis` |
| Style analysis | `fashion-style-analyzer` | `fashion-style-analyzer-prompt` | `analysis` |
| Pattern analysis | `fashion-pattern-analyzer` | `fashion-pattern-analyzer-prompt` | `analysis` |
| Illustration / report | `fashion-illustration-analyzer` | `fashion-illustration-analyzer-prompt` | `analysis` |

**Tools**: `fashion-color-analyzer`, `fashion-style-analyzer`, `fashion-pattern-analyzer` → `web-browser` (optional URL inspection of inspiration refs). Illustration/report agent: **no** `toolRefs` (synthesis only). Keep Trend Research / Reference Image catalog untouched.

**Rationale**: Mirrors Reference Image pattern (tools on early browse-oriented steps; final organizes/synthesizes without tools).

## Decision 3: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the four Style Analysis Agents; prior Fashion fixtures remain; default echo stub for others.

## Decision 4: Graph

**Linear** (clarify): color → style → pattern → illustration/report. No parallel branches or fan-in.

## Decision 5: Context shapes (clarify)

| Key | Producer | Shape |
|-----|----------|--------|
| `colorAnalysis` | color analyzer | `{ summary, findings: [{ label, notes? }] }` |
| `styleAnalysis` | style analyzer | `{ summary, findings: [{ label, notes? }] }` |
| `patternAnalysis` | pattern analyzer | `{ summary, findings: [{ label, notes? }] }` |
| `styleReport` | illustration analyzer **only** | `{ summary, colors[], styles[], patterns[], illustrationNotes[], recommendations[] }` where each list item is `{ label, notes? }` |

Earlier steps MUST NOT write `styleReport`.

## Decision 6: Handoff consumers

| Key | Primary consumer |
|-----|------------------|
| `styleReport` | Design Brief Workflow |
| intermediates | Design Brief (optional enrichment) / human review |
