# Data Model: Design Brief Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-design-brief` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `design-brief`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-design-brief",
      "type": "agent",
      "agentCode": "fashion-design-brief-writer",
      "label": "Generate design brief",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints",
        "styleReport": "styleReport",
        "colorAnalysis": "colorAnalysis",
        "styleAnalysis": "styleAnalysis",
        "patternAnalysis": "patternAnalysis"
      },
      "outputMapping": { "designBrief": "designBrief" }
    },
    {
      "id": "node-design-specification",
      "type": "agent",
      "agentCode": "fashion-design-spec-writer",
      "label": "Generate design specification",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "designBrief": "designBrief",
        "styleReport": "styleReport",
        "colorAnalysis": "colorAnalysis",
        "styleAnalysis": "styleAnalysis",
        "patternAnalysis": "patternAnalysis"
      },
      "outputMapping": { "designSpecification": "designSpecification" }
    }
  ],
  "edges": [
    {
      "id": "edge-brief-spec",
      "from": "node-design-brief",
      "to": "node-design-specification",
      "condition": null
    }
  ],
  "variables": {},
  "policies": {
    "requiredInputs": ["season", "category", "market"]
  }
}
```

## Shared Context contract

| Key | Produced by | Shape |
|-----|-------------|--------|
| `designBrief` | node-design-brief | `{ summary, themes, mustHaves, avoid }` — list items `{ label, notes? }` |
| `designSpecification` | node-design-specification | `{ summary, objectives, constraints, colorDirection, styleDirection, patternDirection, deliverables }` — list items `{ label, notes? }` |

Both keys are required Image Generation handoff artifacts.

## Agents / Prompts / Tools

Two published Agents + two published Prompts (1:1 `promptRef`). Both Agents: `toolRefs: []`.
