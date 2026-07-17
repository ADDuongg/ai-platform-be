# Data Model: Prompt Library

**Feature**: `006-prompt-library` | **Date**: 2026-07-15

## Entities

### Prompt

Reusable prompt identity (catalog row). Assigned to Agents by opaque `code` (`promptRef`).

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| code | string | unique among **active** rows (`deleted_at IS NULL`); slug-like, lowercase; reusable after archive |
| name | string | required |
| description | string | nullable |
| category | string | nullable; filterable |
| tags | jsonb | string[]; default `[]`; filterable |
| status | enum | `draft` \| `published` \| `archived` |
| enabled | boolean | default `true`; disable/enable toggle |
| current_version | int | nullable until first publish; points at current published version number when published |
| created_by | uuid | FK → users (nullable on seed) |
| created_at / updated_at / deleted_at | timestamptz | soft delete; archive sets `deleted_at` and `status=archived` |

**Relationships**: one-to-many → PromptVersion.

**Assignability** (Agent `promptRef` set): `status === published` AND `enabled === true` AND `deleted_at IS NULL`. Lookup by `code` ignores archived rows even if they once used the same code.

**Visibility**:
- Admin (`prompts:update`): all non-deleted by default; may include archived only if explicit filter
- Non-admin (`prompts:read` only): `status === published` AND `deleted_at IS NULL` (`enabled` may be false — still visible, not assignable)

**State transitions (status)**:
- create → `draft`
- publish first version → `published`
- create parallel draft version → stays `published`
- soft-delete → `archived` (+ `deleted_at`)
- `enabled` true ↔ false at any non-archived status (idempotent disable/enable)
- enable on archived → rejected

---

### Prompt Version

Content snapshot for a Prompt.

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| prompt_id | uuid | FK → prompts |
| version | int | monotonic per prompt; start at 1 |
| status | enum | `draft` \| `published` |
| template | text | nullable; may be empty on draft create |
| messages | jsonb | nullable; chat-style array of `{ role, content }`; may be empty/null on draft create |
| variables_schema | jsonb | object; default `{}`; documents placeholders (not executed) |
| model_hints | jsonb | object; default `{}`; metadata only (temperature, max_tokens, …) |
| changelog | string | nullable |
| published_at | timestamptz | null while draft |
| created_by | uuid | nullable FK → users |
| created_at / updated_at | timestamptz | published rows: content fields immutable |

**Message item (logical)**:

| Field | Type | Rules |
|-------|------|--------|
| role | string | `system` \| `user` \| `assistant` (MVP); reject unknown roles |
| content | string | required per item when messages provided |

**Constraints**:
- Unique `(prompt_id, version)`
- Partial unique: at most one `status=draft` per `prompt_id`
- Published version: no in-place updates to template / messages / variables_schema / model_hints

**Usable content (publish gate)**:
- Non-empty trimmed `template`, **OR**
- Non-empty `messages` array with ≥1 item whose `content` is non-empty after trim

**Publish behavior**:
1. Resolve current draft version (reject if none / already published with no draft → clear conflict)
2. Validate usable content
3. Set version `status=published`, `published_at=now`
4. Set prompt `status=published`, `current_version=version`

**New version behavior** (from published prompt):
1. Reject if draft version already exists
2. Copy current published snapshot into new version number `current_version+1` with `status=draft`
3. Prompt remains `published`

---

### Prompt Assignment (logical; not a table)

Stored as `agent_versions.prompt_ref` (varchar, nullable) in Agent Registry. No SQL FK to `prompts`.

| Operation | Rule |
|-----------|------|
| Set non-empty `promptRef` | Active Prompt by code must be `published` + `enabled=true` |
| Clear `promptRef` (`null`) | Always allowed for authorized Agent updaters |
| List Agent with stale ref | Opaque string remains readable; no cascade clear on Prompt disable/archive |

---

## Indexes

- Partial unique: `prompts(code) WHERE deleted_at IS NULL`
- `prompts(status, category)` for list filters
- GIN or containment strategy for `tags` filter as needed
- `prompts(deleted_at)` / rely on soft-delete queries
- `prompt_versions(prompt_id, version)` UNIQUE
- Partial unique index on `prompt_versions(prompt_id)` WHERE `status = 'draft'`

## Seed rows (required)

| Entity | code | status | enabled | notes |
|--------|------|--------|---------|-------|
| Prompt | `research-brief` | published | true | version 1 with non-empty template and/or messages |
| Agent version | `research-agent` | published | true | `prompt_ref = research-brief` (idempotent update) |

Seed MUST be idempotent with existing platform seed flow.

## Validation rules (app layer)

- `code`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 64
- `name`: 1–120 chars
- `category`: max 64 when set
- `tags`: string array; max items / item length bounded (e.g. 20 × 32)
- Template + messages + schemas payload size cap (documented, e.g. 256KB serialized)
- Duplicate active `code` → 409
- Create with empty content → allowed
- Publish with empty content → 400/422
- Mutate published version content → 409/422
- Second parallel draft version → 409
- Publish when no draft to publish → 409
- Non-admin draft access (id/code/version) → 404
- Assign draft / disabled / archived / unknown code as Agent `promptRef` → 422
- Extremely large payloads → 400
