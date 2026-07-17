# Quickstart: Trend Research Workflow

## Prerequisites

```bash
pnpm migration:run
pnpm seed
```

Seed order: rbac → agents → prompts → tools → workflows.

## Sample input

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "ageBand": "3-8",
  "constraints": "playful colors; school-friendly"
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-trend-research` (or list/filter) → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.researchReport` has `summary`, `trends`, `references`, `gaps`.
6. `GET /api/v1/executions/:id/steps` → three completed steps.

## Required-input rejection

```bash
# Missing market → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{ "input": { "season": "SS27", "category": "kids-apparel" } }
```

Whitespace-only required fields also reject.

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish a new version for operators to pick up (Execution uses published version).

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-trend-research`, `fashion-reference-collector`, and `fashion-research-report`. Live LLM/tool adapters are out of scope.
