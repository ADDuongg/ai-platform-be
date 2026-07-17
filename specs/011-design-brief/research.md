# Research: Design Brief Workflow

**Date**: 2026-07-15

## Decision 1: Required inputs

**Choice**: Reuse `definition.policies.requiredInputs = ['season','category','market']` (platform convention from 008). Style Analysis keys (`styleReport`, `colorAnalysis`, `styleAnalysis`, `patternAnalysis`) are **optional** enrichment — Workflow runs standalone.

**Alternatives rejected**: Require `styleReport` at start (breaks standalone demo / quickstart without prior run).

## Decision 2: Agent / Prompt codes

| Step | Agent code | Prompt code | capability |
|------|------------|-------------|------------|
| Design brief | `fashion-design-brief-writer` | `fashion-design-brief-writer-prompt` | `generation` |
| Design specification | `fashion-design-spec-writer` | `fashion-design-spec-writer-prompt` | `generation` |

**Tools**: Both Agents → `toolRefs: []` (clarify). Keep Trend Research / Reference Image / Style Analysis catalog tooling untouched.

**Rationale**: Design Brief is pure synthesis from brief inputs + optional Style Analysis context; no browse/search step in this Workflow.

## Decision 3: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the two Design Brief Agents; prior Fashion fixtures remain; default echo stub for others.

## Decision 4: Graph

**Linear** (spec): brief → specification. No parallel branches.

**Mapping** (clarify): Specification node **MUST** include `designBrief` in `inputMapping` from Shared Context.

## Decision 5: Context shapes (clarify)

| Key | Producer | Shape |
|-----|----------|--------|
| `designBrief` | brief writer **only** | `{ summary, themes[], mustHaves[], avoid[] }` — list items `{ label, notes? }`; no extra free-text narrative field |
| `designSpecification` | spec writer **only** | `{ summary, objectives[], constraints[], colorDirection[], styleDirection[], patternDirection[], deliverables[] }` — list items `{ label, notes? }` |

Earlier/later steps MUST NOT cross-write the other artifact.

## Decision 6: Handoff consumers

| Key | Primary consumer |
|-----|------------------|
| `designBrief` | Image Generation Workflow (required, with specification) |
| `designSpecification` | Image Generation Workflow (required, with brief) |
