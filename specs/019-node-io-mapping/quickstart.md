# Quickstart: Builder Node I/O Mapping

Validate contracts + existing APIs. FE Builder UI lives in `ai-platform-fe`.

## Prerequisites

- API up; migrated + seeded (`pnpm migration:run && pnpm seed`)
- Designer JWT with `workflows:read`, `workflows:update`, `workflows:publish`
- A draft Workflow with ≥1 agent node (any Kids Fashion draft or create draft from published)

## 1) Load draft definition

```http
GET /api/v1/workflows/{workflowId}/definition
Authorization: Bearer {token}
```

Note a `nodes[].id` and current `inputMapping` / `outputMapping`.

## 2) Patch input + output mapping

```http
PATCH /api/v1/workflows/{workflowId}/nodes/{nodeId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "inputMapping": {
    "season": "season",
    "category": "category"
  },
  "outputMapping": {
    "trendFindings": "trendFindings"
  }
}
```

Expect `200` + definition envelope; target node reflects maps.

**Semantics check**: `season` (left) is the **agent input key**; `"season"` (right) is the **context path**.

## 3) Clear a map

```http
PATCH /api/v1/workflows/{workflowId}/nodes/{nodeId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "inputMapping": {}
}
```

Expect empty `inputMapping` on that node (output unchanged if omitted).

## 4) Publish

```http
POST /api/v1/workflows/{workflowId}/publish
Authorization: Bearer {token}
```

Re-fetch published definition (operator/read path) and confirm mappings.

## 5) Optional smoke Execution

Start execution with required start inputs; after the step, context should contain keys written by `outputMapping` (engine behavior unchanged).

## FE checklist (ai-platform-fe)

- [ ] Node panel shows Input / Output mapping editors with correct labels
- [ ] Add / edit / remove rows → PATCH (or equivalent save) persists
- [ ] Incomplete rows not sent
- [ ] Clear all → sends `{}`
- [ ] No update permission → cannot save

## Contracts

See `contracts/node-io-mapping-api.yaml`, `types.ts`, `interfaces.ts`.
