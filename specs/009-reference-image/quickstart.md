# Quickstart: Reference Image Workflow

## Prerequisites

```bash
pnpm migration:run
pnpm seed
```

Seed order: rbac → agents → prompts → tools → workflows.

## Sample input (standalone)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "ageBand": "3-8",
  "constraints": "playful colors; school-friendly"
}
```

## Sample input (with Trend Research handoff)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "researchReport": {
    "summary": "Trend signals for kids-apparel SS27 in VN",
    "trends": [{ "name": "Playful color blocking" }],
    "references": [{ "title": "Kids color stories", "url": "https://example.com/refs/kids-color-stories" }],
    "gaps": []
  },
  "references": [
    { "title": "Kids color stories", "url": "https://example.com/refs/kids-color-stories" }
  ]
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-reference-image` → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.inspirationBoard` has `summary`, `groups`, `references`, `notes`.
6. `GET /api/v1/executions/:id/steps` → three completed steps.

## Required-input rejection

```bash
# Missing market → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{ "input": { "season": "SS27", "category": "kids-apparel" } }
```

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish.

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-image-search`, `fashion-reference-grouper`, and `fashion-inspiration-organizer`. Live image-search adapters are out of scope. Outputs are metadata pointers (URL/title), not binary assets.
