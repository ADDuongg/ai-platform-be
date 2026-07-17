# Data Model: Reference Image Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-reference-image` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `reference-image`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-image-search",
      "type": "agent",
      "agentCode": "fashion-image-search",
      "label": "Search images",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints",
        "researchReport": "researchReport",
        "references": "references",
        "trendFindings": "trendFindings"
      },
      "outputMapping": { "imageCandidates": "imageCandidates" }
    },
    {
      "id": "node-group-references",
      "type": "agent",
      "agentCode": "fashion-reference-grouper",
      "label": "Group references",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "imageCandidates": "imageCandidates",
        "researchReport": "researchReport"
      },
      "outputMapping": { "groupedReferences": "groupedReferences" }
    },
    {
      "id": "node-organize-inspiration",
      "type": "agent",
      "agentCode": "fashion-inspiration-organizer",
      "label": "Organize inspiration",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "imageCandidates": "imageCandidates",
        "groupedReferences": "groupedReferences"
      },
      "outputMapping": { "inspirationBoard": "inspirationBoard" }
    }
  ],
  "edges": [
    {
      "id": "edge-search-group",
      "from": "node-image-search",
      "to": "node-group-references",
      "condition": null
    },
    {
      "id": "edge-group-organize",
      "from": "node-group-references",
      "to": "node-organize-inspiration",
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
| `imageCandidates` | node-image-search | `[{ title, url?, thumbnailUrl?, notes? }]` |
| `groupedReferences` | node-group-references | `[{ group, items: ReferenceItem[] }]` |
| `inspirationBoard` | node-organize-inspiration | `{ summary, groups, references, notes }` |

## Agents / Prompts / Tools

Three published Agents + three published Prompts (1:1 `promptRef`). Search: `toolRefs: ['web-search','web-browser']`. Grouper/organizer: tools optional empty.
