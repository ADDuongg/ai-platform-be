# Data Model: Image Generation Workflow

**No new database tables.** Configuration overlays on existing entities.

## Workflow

| Field | Value |
|-------|--------|
| `code` | `kids-fashion-image-generation` |
| `status` | `published` |
| `current_version` | `1` |
| `category` | `kids-fashion` |
| `tags` | `fashion`, `image-generation`, `milestone-2` |

### `definition_json` (version 1)

```json
{
  "nodes": [
    {
      "id": "node-image-prompt-prep",
      "type": "agent",
      "agentCode": "fashion-image-prompt-prep",
      "label": "Prepare generation prompts",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "ageBand": "ageBand",
        "constraints": "constraints",
        "designBrief": "designBrief",
        "designSpecification": "designSpecification"
      },
      "outputMapping": { "imageGenPrompts": "imageGenPrompts" }
    },
    {
      "id": "node-image-generate",
      "type": "agent",
      "agentCode": "fashion-image-generator",
      "label": "Generate artwork variations",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "imageGenPrompts": "imageGenPrompts",
        "designBrief": "designBrief",
        "designSpecification": "designSpecification"
      },
      "outputMapping": { "rawGenerations": "rawGenerations" }
    },
    {
      "id": "node-image-organize",
      "type": "agent",
      "agentCode": "fashion-image-organizer",
      "label": "Organize generation outputs",
      "inputMapping": {
        "season": "season",
        "category": "category",
        "market": "market",
        "rawGenerations": "rawGenerations",
        "imageGenPrompts": "imageGenPrompts"
      },
      "outputMapping": { "generatedImages": "generatedImages" }
    }
  ],
  "edges": [
    {
      "id": "edge-prep-generate",
      "from": "node-image-prompt-prep",
      "to": "node-image-generate",
      "condition": null
    },
    {
      "id": "edge-generate-organize",
      "from": "node-image-generate",
      "to": "node-image-organize",
      "condition": null
    }
  ],
  "variables": {},
  "policies": {
    "requiredInputs": [
      "season",
      "category",
      "market",
      "designBrief",
      "designSpecification"
    ]
  }
}
```

## Shared Context contract

| Key | Produced by | Shape |
|-----|-------------|--------|
| `imageGenPrompts` | node-image-prompt-prep | `{ summary, prompts[{ id, label, text }] }` |
| `rawGenerations` | node-image-generate | `[{ id, label, promptRef?, assetUrl?, notes? }]` |
| `generatedImages` | node-image-organize | `{ summary, variations[{ id, label, promptRef?, assetUrl?, notes? }] }` |

`generatedImages` is the required Design Review handoff artifact.

## Agents / Prompts / Tools

Three published Agents + three published Prompts (1:1 `promptRef`).

| Agent | toolRefs |
|-------|----------|
| `fashion-image-prompt-prep` | `[]` |
| `fashion-image-generator` | `['image-generation']` |
| `fashion-image-organizer` | `['object-storage']` |
