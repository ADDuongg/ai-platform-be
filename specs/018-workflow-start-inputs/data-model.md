# Data Model: Workflow Start Inputs (018)

No new tables. Extends the logical shape of `workflow_versions.definition_json.policies`.

## WorkflowPolicies (logical)

| Field | Type | Owner | Notes |
|-------|------|-------|-------|
| `requiredInputs` | `string[]` | BE enforce + FE form | Keys that must be non-blank at Execution start |
| `inputSchema` | `Record<string, StartInputFieldSchema>` | FE render; BE opaque persist | Optional; Phase A.2+ |

## StartInputFieldSchema (logical)

| Field | Type | Notes |
|-------|------|-------|
| `label` | `string?` | Display label; FE may title-case key if absent |
| `widget` | `'text' \| 'textarea' \| 'select' \| 'date'?` | FE constant; unknown → text |
| `options` | `string[]?` | Used when `widget === 'select'` |
| `placeholder` | `string?` | Optional hint |
| `default` | `string \| number \| boolean \| null?` | Prefill on Start form; not requiredness |

## Relationships

- Workflow (catalog) 1—* WorkflowVersion (`definition_json`)
- Execution.input (jsonb) — free-form; keys typically align with `requiredInputs`
- WorkflowNode.inputMapping / outputMapping — Phase B; maps start/context into steps

## Invariants

1. Start requiredness = membership in `requiredInputs` only.
2. `inputSchema[key]` without `requiredInputs` inclusion does not make the key required.
3. Adding a key does not require DTO/schema migration on Execution (`input` remains open jsonb).
