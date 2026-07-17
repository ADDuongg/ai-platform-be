# Data Model: Workflow Builder

**Feature**: `004-workflow-builder` | **Date**: 2026-07-14

No new SQL tables. Shape of `workflow_versions.definition_json`:

## WorkflowNode

| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID or client slug; unique within definition |
| type | `"agent"` | Only supported type in MVP |
| agentCode | string | Agent Registry code (lowercase) |
| agentVersion | number \| null | Optional pin |
| label | string \| null | Optional |
| position | `{ x, y }` \| null | Optional layout hint |
| inputMapping | object | Optional |
| outputMapping | object | Optional |
| timeoutMs | number \| null | Optional override |
| maxRetries | number \| null | Optional override |
| config | object | Optional opaque |

## WorkflowEdge

| Field | Type | Notes |
|-------|------|-------|
| id | string | Unique within definition |
| from | string | Source node id |
| to | string | Target node id |
| condition | null \| omitted | Non-null rejected in MVP |

## WorkflowDefinition

| Field | Type |
|-------|------|
| nodes | WorkflowNode[] |
| edges | WorkflowEdge[] |
| variables | object |
| policies | object |

## Invariants

- Draft version only mutable
- Agent ref assignable: published + enabled + not deleted
- No self-loop, duplicate (from,to), missing endpoints, cycles
- Node remove cascades edges
- Size ≤ 256KB (Management limit)
