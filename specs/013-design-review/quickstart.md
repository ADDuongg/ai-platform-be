# Quickstart: Design Review Workflow

## Prerequisites

```bash
pnpm migration:run
pnpm seed
```

Seed order: rbac → agents → prompts → tools → workflows.

## Sample input (with Image Generation handoff)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "ageBand": "3-8",
  "constraints": "playful colors; school-friendly",
  "generatedImages": {
    "summary": "Two playful color-block kids apparel concepts for SS27 VN",
    "variations": [
      {
        "id": "var-1",
        "label": "Cream base pastel blocks",
        "promptRef": "prompt-1",
        "assetUrl": "stub://generated/var-1.png",
        "notes": "Warm cream + pastel accents"
      },
      {
        "id": "var-2",
        "label": "Soft geometric playground",
        "promptRef": "prompt-2",
        "assetUrl": "stub://generated/var-2.png",
        "notes": "Soft geometric blocks"
      }
    ]
  }
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-design-review` → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.qualityReview` has `summary` and ≥1 `findings` (`{ id, label, ... }`).
6. Confirm `context.improvementSuggestions` has `summary` and ≥1 `suggestions`.
7. Confirm `context.designReviewScore` has `summary`, numeric `overallScore` (0–100), and exactly **2** `perVariation` entries under default fixtures.
8. `GET /api/v1/executions/:id/steps` → three completed steps (quality → suggestions → score).

## Required-input rejection

```bash
# Missing generatedImages → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{
  "input": {
    "season": "SS27",
    "category": "kids-apparel",
    "market": "VN"
  }
}
```

Note: start does **not** reject solely because `variations` has fewer than 2 items — only key presence is enforced.

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish.

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-quality-reviewer`, `fashion-improvement-suggester`, and `fashion-design-scorer`. Live vision/LLM adapters are out of scope. Scorer wires `object-storage`.

See contracts: [contracts/](./contracts/) · data model: [data-model.md](./data-model.md)
