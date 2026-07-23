# Data Model: Builder Node I/O Mapping

**Feature**: `019-node-io-mapping`  
**Storage**: Existing `workflow_versions.definition_json` (no new tables)

## Entities

### WorkflowNode (subset)

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | Stable within definition |
| `type` | `'agent'` | MVP |
| `agentCode` | string | Required |
| `inputMapping` | `Record<string, string \| unknown>` \| omit | Agent key → context path (string preferred) |
| `outputMapping` | `Record<string, string \| unknown>` \| omit | Context key → output path (string preferred) |
| other | … | label, position, timeouts, config — unchanged |

### MappingPair (UI / FE helper — not a DB row)

| Field | Type | Notes |
|-------|------|--------|
| `left` | string | Object key in persisted map |
| `right` | string | Path value (flat or dotted) |

FE converts `MappingPair[]` ↔ `Record<string, string>` before PATCH.

## Validation rules (persist)

- Left key: non-empty string after trim; duplicates collapsed to one entry.
- Right path (MVP UI): non-empty string; may contain `.` for nested getByPath.
- Incomplete editor rows: do not include in PATCH body.
- To **clear** a map: send `inputMapping: {}` or `outputMapping: {}` (do not omit if intent is clear — omit leaves previous value on PATCH).
- To **leave unchanged**: omit the field from PATCH body.

## Runtime (read-only reference — unchanged)

| Step | Behavior |
|------|----------|
| Input | `applyInputMapping(context, node.inputMapping)` |
| Output | `applyOutputMapping(context, agentOutput, node.outputMapping)` |

Empty mapping → see engine: input returns `{ ...context }`; output returns `{ ...context, ...output }`.

## State

| State | Mapping editable? |
|-------|-------------------|
| Draft version | Yes (`workflows:update`) |
| Published version | No (publish copies draft; edit requires draft) |
