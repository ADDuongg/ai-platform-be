# Quickstart: Execution Deliverables / Artifacts

Validate materialization + list/download APIs. Contracts: `contracts/execution-artifacts-api.yaml`.

## Prerequisites

- API up; migrated (`execution_artifacts` table) + seeded
- JWT with `executions:read` (and `workflows:execute` to start a run)
- Kids Fashion workflow seed includes `policies.outputs` for `rawGenerations`

## 1) Inline text smoke (optional dedicated workflow or temporary definition)

Complete an Execution whose published definition includes:

```json
"policies": {
  "outputs": [
    { "key": "emailDraft", "kind": "text", "label": "Email", "persist": "inline" }
  ]
}
```

and final context contains `"emailDraft": "Hello customer"`.

Expect Artifact list entry: `key=emailDraft`, `status=ready`, `contentJson` matching text.

## 2) Kids Fashion blob image_set

```http
POST /api/v1/workflows/by-code/kids-fashion-research-to-image/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "input": {
    "season": "SS27",
    "category": "tees",
    "market": "EU"
  }
}
```

Wait until Execution `status=completed`.

```http
GET /api/v1/executions/{executionId}/artifacts
Authorization: Bearer {token}
```

Expect at least one Artifact with `key=rawGenerations`, `kind=image_set`, `status=ready` (or `failed` with error if download blocked), `contentJson.items[].storageKey` set when ready.

```http
GET /api/v1/executions/{executionId}/artifacts/{artifactId}/content
Authorization: Bearer {token}
```

For image_set, contract may return JSON manifest; for single-blob kinds, binary stream with `Content-Type`.

Confirm files exist under `ARTIFACT_STORAGE_ROOT` (default `.data/execution-artifacts`).

## 3) Backward compatible / permissions

- Workflow without `outputs` → completed Execution → `GET .../artifacts` → `data: []`
- Missing `executions:read` → **403**
- Unknown execution → **404**

## 4) Unit smoke

```bash
pnpm exec jest src/modules/executions/services/artifact-materializer.service.spec.ts --no-coverage
```

Cover: inline ready; blob download mock; missing key → failed without changing execution status.
