# Quickstart: Workflow Start Inputs (FE + existing BE)

Contract pack: `specs/018-workflow-start-inputs/contracts/`  
No Nest code change required for Phase A.1.

## FE screen split (chốt UX)

| Screen | Edits |
|--------|--------|
| **Workflow detail** (Overview / dedicated Start inputs section) | Add / update / delete keys; `label`, `widget`, `options`, `placeholder` |
| **Builder** | `inputSchema[key].default` only (prefill) |
| **Modules Start a run** | Render + submit; prefill from `default` |

Same API: `GET`/`PUT /workflows/{id}/definition` — FE merges policies carefully (preserve keys when only changing `default`).

## A.1 — Configure keys + dynamic text form

1. Login as designer/admin → access token.
2. Resolve Workflow id (example Trend Research):
   - `GET /api/v1/workflows?status=published` → find `code === "kids-fashion-trend-research"`.
3. Open draft (create draft version if needed via existing Workflow Management APIs).
4. `GET /api/v1/workflows/{id}/definition` → note `definition`.
5. Edit start keys only in policies, preserve graph:

```json
{
  "definition": {
    "nodes": ["…unchanged…"],
    "edges": ["…unchanged…"],
    "variables": {},
    "policies": {
      "requiredInputs": ["season", "category", "market", "productLine"]
    }
  },
  "changelog": "Add productLine start input"
}
```

6. `PUT /api/v1/workflows/{id}/definition` with the body above.
7. `POST /api/v1/workflows/{id}/publish`.
8. As operator: `GET .../definition` → read `policies.requiredInputs`.
9. FE: `buildDynamicStartFields(policies)` (see `contracts/types.ts`) → render text inputs.
10. `POST /api/v1/workflows/{id}/execute` with:

```json
{
  "input": {
    "season": "SS26",
    "category": "apparel",
    "market": "US",
    "productLine": "tees"
  }
}
```

11. Omit `productLine` → expect validation error (existing `requiredInputs` enforcement).

## A.2 — Widgets (optional)

Same PUT, add `policies.inputSchema`:

```json
"inputSchema": {
  "category": {
    "label": "Category",
    "widget": "select",
    "options": ["apparel", "accessories"],
    "default": "apparel"
  }
}
```

FE maps `widget` → control; prefill from `default` when present; unknown widget → text.

## Phase B — Node mapping

`PATCH /api/v1/workflows/{id}/nodes/{nodeId}` with `inputMapping` / `outputMapping`, then publish.

## FE import

```ts
import type { WorkflowStartInputsApiClient } from './contracts';
import { buildDynamicStartFields } from './contracts';
```
