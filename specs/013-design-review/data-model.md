# Data Model: Design Review Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-design-review` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `design-review`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-quality-review",
      "type": "agent",
      "agentCode": "fashion-quality-reviewer",
      "label": "Review quality",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints",
        "generatedImages": "generatedImages",
        "designBrief": "designBrief",
        "designSpecification": "designSpecification"
      },
      "outputMapping": { "qualityReview": "qualityReview" }
    },
    {
      "id": "node-improvement-suggestions",
      "type": "agent",
      "agentCode": "fashion-improvement-suggester",
      "label": "Improvement suggestions",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "qualityReview": "qualityReview",
        "generatedImages": "generatedImages"
      },
      "outputMapping": { "improvementSuggestions": "improvementSuggestions" }
    },
    {
      "id": "node-design-score",
      "type": "agent",
      "agentCode": "fashion-design-scorer",
      "label": "Final score",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "qualityReview": "qualityReview",
        "improvementSuggestions": "improvementSuggestions",
        "generatedImages": "generatedImages"
      },
      "outputMapping": { "designReviewScore": "designReviewScore" }
    }
  ],
  "edges": [
    {
      "id": "edge-quality-suggestions",
      "from": "node-quality-review",
      "to": "node-improvement-suggestions",
      "condition": null
    },
    {
      "id": "edge-suggestions-score",
      "from": "node-improvement-suggestions",
      "to": "node-design-score",
      "condition": null
    }
  ],
  "variables": {},
  "policies": {
    "requiredInputs": ["season", "category", "market", "generatedImages"]
  }
}
```

## Shared Context contract

| Key | Produced by | Shape |
|-----|-------------|--------|
| `qualityReview` | node-quality-review | `{ summary, findings[{ id, label, severity?, variationRef?, notes? }] }` |
| `improvementSuggestions` | node-improvement-suggestions | `{ summary, suggestions[{ id, label, priority?, variationRef?, notes? }] }` |
| `designReviewScore` | node-design-score | `{ summary, overallScore, perVariation?[{ variationRef, score, notes? }], criteria?[], notes?[] }` |

`designReviewScore` is the required Milestone 2 terminal artifact. Default fixtures MUST include `perVariation` with exactly 2 entries.

## Agents / Prompts / Tools

Three published Agents + three published Prompts (1:1 `promptRef`).

| Agent | toolRefs |
|-------|----------|
| `fashion-quality-reviewer` | `[]` |
| `fashion-improvement-suggester` | `[]` |
| `fashion-design-scorer` | `['object-storage']` |
