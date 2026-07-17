# Quickstart: Image Generation Workflow

## Prerequisites

```bash
pnpm migration:run
pnpm seed
```

Seed order: rbac → agents → prompts → tools → workflows.

## Sample input (with Design Brief handoff)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "ageBand": "3-8",
  "constraints": "playful colors; school-friendly",
  "designBrief": {
    "summary": "Playful color-block kids apparel for SS27 VN",
    "themes": [{ "label": "Playful color blocking" }],
    "mustHaves": [{ "label": "Warm cream base with pastel accents" }],
    "avoid": [{ "label": "Harsh neon overload" }]
  },
  "designSpecification": {
    "summary": "Specification for playful kids color-block concept",
    "objectives": [{ "label": "Deliver playful color-block kids apparel concept" }],
    "constraints": [{ "label": "Age-appropriate, school-friendly" }],
    "colorDirection": [{ "label": "Cream base + pastel accents" }],
    "styleDirection": [{ "label": "Relaxed silhouette" }],
    "patternDirection": [{ "label": "Soft geometric blocks" }],
    "deliverables": [{ "label": "Two concept artwork variations" }]
  }
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-image-generation` → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.imageGenPrompts` has `summary` and exactly **2** `prompts` (`{ id, label, text }`).
6. Confirm `context.rawGenerations` is an array of exactly **2** drafts (`{ id, label, ... }`).
7. Confirm `context.generatedImages` has `summary` and exactly **2** `variations`.
8. `GET /api/v1/executions/:id/steps` → three completed steps (prep → generate → organize).

## Required-input rejection

```bash
# Missing designBrief → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{
  "input": {
    "season": "SS27",
    "category": "kids-apparel",
    "market": "VN",
    "designSpecification": { "summary": "x", "objectives": [], "constraints": [], "colorDirection": [], "styleDirection": [], "patternDirection": [], "deliverables": [] }
  }
}
```

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish.

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-image-prompt-prep`, `fashion-image-generator`, and `fashion-image-organizer` (exactly 2 variations). Live image-provider adapters are out of scope. Generator wires `image-generation`; organizer wires `object-storage`.

See contracts: [contracts/](./contracts/) · data model: [data-model.md](./data-model.md)
