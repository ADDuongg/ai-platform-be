# Data Model: Trend Research Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-trend-research` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `trend-research`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-trend-research",
      "type": "agent",
      "agentCode": "fashion-trend-research",
      "label": "Research trends",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints"
      },
      "outputMapping": { "trendFindings": "trendFindings" }
    },
    {
      "id": "node-collect-references",
      "type": "agent",
      "agentCode": "fashion-reference-collector",
      "label": "Collect references",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "trendFindings": "trendFindings"
      },
      "outputMapping": { "references": "references" }
    },
    {
      "id": "node-research-report",
      "type": "agent",
      "agentCode": "fashion-research-report",
      "label": "Generate research report",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "trendFindings": "trendFindings",
        "references": "references"
      },
      "outputMapping": { "researchReport": "researchReport" }
    }
  ],
  "edges": [
    {
      "id": "edge-research-refs",
      "from": "node-trend-research",
      "to": "node-collect-references",
      "condition": null
    },
    {
      "id": "edge-refs-report",
      "from": "node-collect-references",
      "to": "node-research-report",
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
| `trendFindings` | node-trend-research | `{ summary: string, trends: array }` |
| `references` | node-collect-references | `[{ title, url?, notes? }]` |
| `researchReport` | node-research-report | `{ summary, trends, references, gaps }` |

## Agents / Prompts / Tools

Three published Agents + three published Prompts (1:1 `promptRef`). Research + collector: `toolRefs: ['web-search']`. Report: tools optional empty.

## `policies.requiredInputs` (platform convention)

- Type: `string[]` of top-level input object keys
- Empty / absent / non-array → no required-input rejection
- Enforced at Execution start only (not Builder mutate)
