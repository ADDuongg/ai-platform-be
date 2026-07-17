# Quickstart: Design Brief Workflow

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

## Sample input (with Style Analysis handoff)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "styleReport": {
    "summary": "Playful color-forward kids apparel for SS27 VN",
    "colors": [{ "label": "Coral and sky blue" }],
    "styles": [{ "label": "Relaxed silhouette" }],
    "patterns": [{ "label": "Small geo print" }],
    "illustrationNotes": [{ "label": "Soft illustration line" }],
    "recommendations": [{ "label": "Keep age-appropriate palettes" }]
  },
  "colorAnalysis": {
    "summary": "Warm corals with cool accents",
    "findings": [{ "label": "Coral primary" }]
  }
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-design-brief` → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.designBrief` has `summary`, `themes`, `mustHaves`, `avoid` (list items `{ label, notes? }`).
6. Confirm `context.designSpecification` has `summary`, `objectives`, `constraints`, `colorDirection`, `styleDirection`, `patternDirection`, `deliverables`.
7. `GET /api/v1/executions/:id/steps` → two completed steps (brief then specification).

## Required-input rejection

```bash
# Missing market → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{ "input": { "season": "SS27", "category": "kids-apparel" } }
```

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish.

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-design-brief-writer` and `fashion-design-spec-writer`. Live LLM adapters are out of scope. Agents have empty `toolRefs` in seed.

See contracts: [contracts/](./contracts/) · data model: [data-model.md](./data-model.md)
