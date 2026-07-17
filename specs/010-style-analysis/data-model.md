# Data Model: Style Analysis Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-style-analysis` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `style-analysis`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-color-analysis",
      "type": "agent",
      "agentCode": "fashion-color-analyzer",
      "label": "Color analysis",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints",
        "inspirationBoard": "inspirationBoard",
        "groupedReferences": "groupedReferences",
        "imageCandidates": "imageCandidates"
      },
      "outputMapping": { "colorAnalysis": "colorAnalysis" }
    },
    {
      "id": "node-style-analysis",
      "type": "agent",
      "agentCode": "fashion-style-analyzer",
      "label": "Style analysis",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "colorAnalysis": "colorAnalysis",
        "inspirationBoard": "inspirationBoard",
        "groupedReferences": "groupedReferences"
      },
      "outputMapping": { "styleAnalysis": "styleAnalysis" }
    },
    {
      "id": "node-pattern-analysis",
      "type": "agent",
      "agentCode": "fashion-pattern-analyzer",
      "label": "Pattern analysis",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "colorAnalysis": "colorAnalysis",
        "styleAnalysis": "styleAnalysis",
        "inspirationBoard": "inspirationBoard"
      },
      "outputMapping": { "patternAnalysis": "patternAnalysis" }
    },
    {
      "id": "node-illustration-analysis",
      "type": "agent",
      "agentCode": "fashion-illustration-analyzer",
      "label": "Illustration analysis",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "colorAnalysis": "colorAnalysis",
        "styleAnalysis": "styleAnalysis",
        "patternAnalysis": "patternAnalysis",
        "inspirationBoard": "inspirationBoard"
      },
      "outputMapping": { "styleReport": "styleReport" }
    }
  ],
  "edges": [
    {
      "id": "edge-color-style",
      "from": "node-color-analysis",
      "to": "node-style-analysis",
      "condition": null
    },
    {
      "id": "edge-style-pattern",
      "from": "node-style-analysis",
      "to": "node-pattern-analysis",
      "condition": null
    },
    {
      "id": "edge-pattern-illustration",
      "from": "node-pattern-analysis",
      "to": "node-illustration-analysis",
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
| `colorAnalysis` | node-color-analysis | `{ summary, findings: [{ label, notes? }] }` |
| `styleAnalysis` | node-style-analysis | `{ summary, findings: [{ label, notes? }] }` |
| `patternAnalysis` | node-pattern-analysis | `{ summary, findings: [{ label, notes? }] }` |
| `styleReport` | node-illustration-analysis | `{ summary, colors, styles, patterns, illustrationNotes, recommendations }` — list items `{ label, notes? }` |

## Agents / Prompts / Tools

Four published Agents + four published Prompts (1:1 `promptRef`). Color/style/pattern: `toolRefs: ['web-browser']`. Illustration: tools empty.
