# Quickstart: Style Analysis Workflow

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

## Sample input (with Reference Image handoff)

```json
{
  "season": "SS27",
  "category": "kids-apparel",
  "market": "VN",
  "inspirationBoard": {
    "summary": "Inspiration set for kids-apparel SS27 in VN",
    "groups": [{ "group": "Playful color blocking", "items": [] }],
    "references": [
      {
        "title": "Kids color stories",
        "url": "https://example.com/refs/kids-color-stories"
      }
    ],
    "notes": ["Ready for Style Analysis"]
  },
  "groupedReferences": [
    {
      "group": "Playful color blocking",
      "items": [
        {
          "title": "Kids color stories",
          "url": "https://example.com/refs/kids-color-stories"
        }
      ]
    }
  ]
}
```

## Happy path

1. Login as designer/operator (execute permission).
2. `GET /api/v1/workflows?code=kids-fashion-style-analysis` → published Workflow id.
3. `POST /api/v1/workflows/:id/execute` with body `{ "input": { ...sample } }`.
4. Poll `GET /api/v1/executions/:id` until `status=completed`.
5. Confirm `context.styleReport` has `summary`, `colors`, `styles`, `patterns`, `illustrationNotes`, `recommendations` (list items `{ label, notes? }`).
6. Confirm intermediates `colorAnalysis`, `styleAnalysis`, `patternAnalysis` each have `summary` + `findings`.
7. `GET /api/v1/executions/:id/steps` → four completed steps (linear order).

## Required-input rejection

```bash
# Missing market → 400 VALIDATION_ERROR; no runnable execution
POST /api/v1/workflows/:id/execute
{ "input": { "season": "SS27", "category": "kids-apparel" } }
```

## Declarative keys

Required keys live at `definition.policies.requiredInputs`. Change via draft definition PUT (Builder), then publish.

## Stub note

MVP Agent runner returns deterministic Fashion fixtures for `fashion-color-analyzer`, `fashion-style-analyzer`, `fashion-pattern-analyzer`, and `fashion-illustration-analyzer`. Live vision/CV adapters are out of scope. Analysis uses metadata/structured references, not binary assets.

See contracts: [contracts/](./contracts/) · data model: [data-model.md](./data-model.md)
