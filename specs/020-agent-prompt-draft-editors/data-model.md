# Data Model: Agent / Prompt Draft Editors

**Feature**: `020-agent-prompt-draft-editors`  
**Date**: 2026-07-21

Logical model only — **no new tables**. Persistence remains Agent/Prompt version rows.

## Entities (existing)

### Agent

| Attribute | Notes |
|-----------|--------|
| id, code, name, … | Header / catalog |
| status | `draft` \| `published` \| `archived` |
| currentVersion | Published version number |
| draftVersion | Present when parallel draft exists |

### AgentVersion

| Attribute | Notes |
|-----------|--------|
| version, status | `draft` \| `published` |
| inputSchema | jsonb object schema |
| outputSchema | jsonb object schema |
| config, promptRef, toolRefs, … | Unchanged by this feature’s primary forms |
| publishedAt | Set on publish |

### Prompt / PromptVersion

| Attribute | Notes |
|-----------|--------|
| template | Primary MVP edit surface |
| variablesSchema | Fast follow (US4) |
| messages, modelHints | Out of primary MVP form (Advanced / later) |
| status / draftVersion | Same versioning pattern as Agent |

## FE form model (not persisted as-is)

### SchemaField

| Field | Rule |
|-------|------|
| name | Identifier: `^[A-Za-z_][A-Za-z0-9_]*$`; unique within Input or Output list |
| type | MVP: `string` \| `number` \| `boolean` |
| required | boolean → membership in schema `required[]` |

### Derived ObjectSchema (persisted)

```text
type: "object"
properties: { [name]: { type } }
required: string[]  // names where required=true
```

Complex branches (nested objects, `items`, `oneOf`, …) live only in Advanced JSON buffer; form save must not wipe them when using merge-from-flat rules **within active form mode** — i.e. when saving from form, rebuild properties for edited flat keys while preserving unknown top-level schema keys and nested property schemas that were not represented as simple form rows (implementation detail for FE; contract helpers document intent).

**Practical MVP rule (contracts helpers)**:

- `fieldsToObjectSchema(fields)` builds a **flat** object schema (full replace of that schema document when saving from form).
- If the loaded schema was complex, FE should either (a) warn and only allow Advanced save, or (b) when saving from form after user confirmed, replace with flat schema (destructive) — **preferred UX per clarification**: warn that complex parts exist; if user stays on form and saves, active form wins → **flat replace** of that schema. Nested preservation applies when merging is implemented; for MVP simplicity, **form Save = replace schema with flat object derived from fields** after user acknowledges warning if complexity was detected.

Clarify alignment: “MUST NOT silently wipe” → FE must **warn** before form-save when complexity detected; after confirm, form replace is allowed (active mode).

## State transitions

```text
published (no draft)
    --POST .../versions-->  published + draftVersion
draft content
    --PATCH-->  draft updated
draft
    --POST .../publish-->  published (new currentVersion); draft cleared
```

Published version content immutable; edits require draft.

## Validation summary

| Rule | Layer |
|------|--------|
| Identifier field names | FE (FR-007); BE may still accept broader JSON keys via Advanced |
| Permission gates | BE Guards (existing) |
| No draft for config/content PATCH | BE 409 |
| Publish permission separate from update | BE |
