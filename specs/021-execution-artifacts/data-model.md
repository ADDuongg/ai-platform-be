# Data Model: Execution Deliverables / Artifacts

**Feature**: `021-execution-artifacts` | **Date**: 2026-07-22

## Workflow declaration (`definition.policies.outputs`)

Stored in existing Workflow definition jsonb (`policies`):

```ts
type WorkflowOutputKind = 'text' | 'json' | 'image' | 'image_set' | 'file' | 'url'
type WorkflowOutputPersist = 'inline' | 'blob'

interface WorkflowOutputDeclaration {
  key: string              // final context key / path root (MVP: top-level key)
  kind: WorkflowOutputKind
  label?: string
  persist: WorkflowOutputPersist
}
```

Example (Kids Fashion):

```json
{
  "outputs": [
    {
      "key": "rawGenerations",
      "kind": "image_set",
      "label": "Generated looks",
      "persist": "blob"
    }
  ]
}
```

Validation (MVP soft): `key` non-empty string; `kind` / `persist` known enums; unique keys recommended.

## Entity: `ExecutionArtifact`

Table: `execution_artifacts`

| Column | Type | Notes |
|--------|------|--------|
| id | uuid PK | |
| execution_id | uuid FK → executions.id | ON DELETE CASCADE |
| key | varchar | Declared output key |
| kind | varchar | text \| json \| image \| image_set \| file \| url |
| label | varchar nullable | |
| persist | varchar | inline \| blob |
| status | varchar | ready \| failed |
| content_json | jsonb nullable | Inline payload and/or image_set manifest |
| storage_key | varchar nullable | Relative key under artifact storage root (single-blob kinds) |
| content_type | varchar nullable | MIME for primary blob |
| byte_size | int nullable | Primary blob size |
| source_node_id | varchar nullable | Optional; MVP often null |
| error_message | text nullable | When status=failed |
| error_json | jsonb nullable | Structured failure detail |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Constraints / indexes**

- UNIQUE `(execution_id, key)`
- INDEX `(execution_id)`

**Relationships**

- Many Artifacts → one Execution
- No soft-delete / versioning in MVP

## Materialization mapping

| Declaration | Context value | Persist result |
|-------------|---------------|----------------|
| kind text/json, persist inline | string / object | `content_json` = value (wrap string as `{ "text": "..." }` or store raw json); status ready |
| kind url, persist inline | string URL | `content_json` = `{ "url": "..." }` |
| kind image/file, persist blob | URL or `{ assetUrl }` | download → put → `storage_key`, `content_type`, `byte_size` |
| kind image_set, persist blob | array of items with `assetUrl` | download each → `content_json.items[]` with storageKey; partial failures → status failed if **all** fail, else ready with per-item errors in manifest |

Missing key / empty → status `failed`, error_message set.

## State

Artifact has no lifecycle beyond `ready` | `failed` at create time. Execution lifecycle unchanged.
