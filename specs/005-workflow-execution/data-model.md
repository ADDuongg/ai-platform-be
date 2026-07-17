# Data Model: Workflow Execution

## executions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workflow_id | uuid | indexed; no hard FK required (history survives workflow delete) |
| workflow_code | varchar(64) | snapshot |
| workflow_version | int | pinned published version |
| status | varchar(32) | pending\|running\|completed\|failed\|cancelled |
| input_json | jsonb | caller input |
| context_json | jsonb | shared context |
| definition_snapshot | jsonb | definition + agentPins |
| error_json | jsonb nullable | terminal error summary |
| started_by | uuid nullable | |
| started_at | timestamptz nullable | |
| completed_at | timestamptz nullable | |
| created_at / updated_at / deleted_at | timestamptz | BaseEntity soft delete unused for MVP history |

Indexes: `(workflow_id, created_at DESC)`, `(status)`, `(started_by)`

## execution_steps

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| execution_id | uuid FK → executions ON DELETE CASCADE | |
| node_id | varchar(64) | from definition |
| agent_code | varchar(64) | |
| agent_version | int | pinned |
| status | varchar(32) | pending\|running\|completed\|failed\|cancelled\|retrying |
| attempt | int | starts at 0; increments on each try |
| max_retries | int | from node/agent |
| input_json | jsonb nullable | |
| output_json | jsonb nullable | |
| error_json | jsonb nullable | |
| started_at / completed_at | timestamptz nullable | |
| created_at / updated_at / deleted_at | | |

Indexes: `(execution_id)`, unique `(execution_id, node_id)` for MVP single row per node (attempts overwrite fields / increment attempt)

## State transitions

Execution: `pending` → `running` → `completed` | `failed` | `cancelled`

Step: `pending` → `running` → `completed` | `failed` | `cancelled`; `failed`/`retrying` → `running` on retry
