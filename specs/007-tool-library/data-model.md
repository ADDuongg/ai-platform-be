# Data Model: Tool Library

**Feature**: `007-tool-library` | **Date**: 2026-07-15

## Entities

### Tool

Reusable tool capability identity (catalog row). Assigned to Agents by opaque `code` (`toolRefs[]`).

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| code | string | unique among **active** rows (`deleted_at IS NULL`); slug-like, lowercase; reusable after archive |
| name | string | required |
| description | string | nullable |
| tool_type | enum | `search` \| `browser` \| `image_generation` \| `storage` \| `http` \| `custom`; **immutable after create** |
| status | enum | `draft` \| `published` \| `archived` |
| enabled | boolean | default `true`; disable/enable toggle |
| current_version | int | nullable until first publish; points at current published version number when published |
| created_by | uuid | FK → users (nullable on seed) |
| created_at / updated_at / deleted_at | timestamptz | soft delete; archive sets `deleted_at` and `status=archived` |

**Relationships**: one-to-many → ToolVersion.

**Assignability** (Agent `toolRefs` set): each code → `status === published` AND `enabled === true` AND `deleted_at IS NULL`. Lookup by `code` ignores archived rows.

**Visibility**:
- Admin (`tools:update`): all non-deleted by default; may include archived only if explicit filter
- Non-admin (`tools:read` only): `status === published` AND `deleted_at IS NULL` (`enabled` may be false — still visible, not assignable)

**State transitions (status)**:
- create → `draft`
- publish first version → `published`
- create parallel draft version → stays `published`
- soft-delete → `archived` (+ `deleted_at`)
- `enabled` true ↔ false at any non-archived status (idempotent disable/enable)
- enable on archived → rejected

---

### Tool Version

Config snapshot for a Tool.

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| tool_id | uuid | FK → tools |
| version | int | monotonic per tool; start at 1 |
| status | enum | `draft` \| `published` |
| config_json | jsonb | object; default `{}`; may be empty; MUST NOT contain plaintext secret-shaped keys |
| input_schema | jsonb | object; default `{}` |
| output_schema | jsonb | object; default `{}` |
| secret_ref | string | nullable; opaque pointer only (not a secret value) |
| timeout_ms | int | nullable; positive when set |
| max_retries | int | nullable; ≥0 when set |
| changelog | string | nullable |
| published_at | timestamptz | null while draft |
| created_by | uuid | nullable FK → users |
| created_at / updated_at | timestamptz | published rows: config fields immutable |

**Constraints**:
- Unique `(tool_id, version)`
- Partial unique: at most one `status=draft` per `tool_id`
- Published version: no in-place updates to config_json / schemas / secret_ref / timeout / retries

**Secret-shaped keys (reject if present as top-level or nested object keys with string values — MVP: scan top-level + one nested level)**:
- Case-insensitive match: `apikey`, `api_key`, `password`, `token`, `secret`, `accesskey`, `access_key`, `privatekey`, `private_key`

**Publish behavior**:
1. Resolve current draft version (reject if none / already published with no draft → clear conflict)
2. Re-validate config (no secret-shaped keys)
3. Set version `status=published`, `published_at=now`
4. Set tool `status=published`, `current_version=version`

**New version behavior** (from published tool):
1. Reject if draft version already exists
2. Copy current published snapshot into new version number `current_version+1` with `status=draft`
3. Tool remains `published`

---

### Tool Assignment (logical; not a table)

Stored as `agent_versions.tool_refs` (jsonb string array) in Agent Registry. No SQL FK to `tools`.

| Operation | Rule |
|-----------|------|
| Set non-empty `toolRefs` | Every code → active published + enabled Tool; unique; length ≤ 20; unordered set |
| Clear `toolRefs` (`[]`) | Always allowed for authorized Agent updaters |
| List Agent with stale refs | Opaque strings remain readable; no cascade clear on Tool disable/archive |

---

## Indexes

- Partial unique: `tools(code) WHERE deleted_at IS NULL`
- `tools(status, tool_type)` for list filters
- `tools(deleted_at)` / rely on soft-delete queries
- `tool_versions(tool_id, version)` UNIQUE
- Partial unique index on `tool_versions(tool_id)` WHERE `status = 'draft'`

## Seed rows (required)

| Entity | code | tool_type | status | enabled | notes |
|--------|------|-----------|--------|---------|-------|
| Tool | `web-search` | `search` | published | true | version 1 stub config |
| Tool | `web-browser` | `browser` | published | true | version 1 stub config |
| Tool | `image-generation` | `image_generation` | published | true | version 1 stub config |
| Tool | `object-storage` | `storage` | published | true | version 1 stub config |
| Agent version | `research-agent` | — | published | true | `tool_refs` includes `web-search` |
| Agent version | `review-agent` | — | published | true | `tool_refs` includes `object-storage` |

Seed MUST be idempotent with existing platform seed flow. No live credentials in `config_json`.

## Validation rules (app layer)

- `code`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 64
- `name`: 1–120 chars
- `tool_type`: enum only; immutable after create
- `config_json` / schemas payload size cap (documented, e.g. 256KB serialized)
- Duplicate active `code` → 409
- Secret-shaped keys in config → 400/422
- Mutate published version config → 409/422
- Second parallel draft version → 409
- Publish when no draft to publish → 409
- Non-admin draft access (id/code/version) → 404
- Assign draft / disabled / archived / unknown / duplicate / >20 codes as Agent `toolRefs` → 422
- Extremely large payloads → 400
