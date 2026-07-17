# Quickstart: Workflow Execution

## Prerequisites

```bash
pnpm migration:run
pnpm seed
```

Seed includes published Agents (`research-agent`, `review-agent`) and workflows:
- `sample-empty-workflow` (empty graph → completes with 0 steps)
- `sample-research-review` (research → review)

## Smoke scenarios

1. **Login** as operator/designer → obtain JWT.
2. **List workflows** → note `sample-research-review` id.
3. **Execute**: `POST /api/v1/workflows/:id/execute` body `{ "input": { "topic": "kids fashion" } }` → 201 with execution id, status pending/running.
4. **Poll** `GET /api/v1/executions/:id` until `completed`.
5. **Steps** `GET /api/v1/executions/:id/steps` → 2 completed steps; context contains stub outputs.
6. **Empty graph**: execute `sample-empty-workflow` → completed, zero steps.
7. **Cancel**: start research-review → immediately `POST .../cancel` → cancelled (if still non-terminal).
8. **Permissions**: viewer can read; cannot execute/cancel/retry.

## Alternate start

`POST /api/v1/executions` body `{ "workflowId": "...", "input": {} }` requires `executions:create`.
