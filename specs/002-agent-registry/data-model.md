# Data Model: Agent Registry

**Feature**: `002-agent-registry` | **Date**: 2026-07-14

## Entities

### Agent

Reusable capability identity (catalog row).

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| code | string | unique globally (including soft-deleted); slug-like, lowercase |
| name | string | required |
| description | string | nullable |
| capability_type | enum | `research` \| `image_search` \| `analysis` \| `generation` \| `review` \| `translation` \| `custom` |
| status | enum | `draft` \| `published` \| `archived` |
| enabled | boolean | default `true`; disable/enable toggle |
| current_version | int | nullable until first version; points at current published version number when published |
| created_by | uuid | FK → users (nullable on seed) |
| created_at / updated_at / deleted_at | timestamptz | soft delete; archive sets `deleted_at` and `status=archived` |

**Relationships**: one-to-many → AgentVersion.

**Assignability** (for later Workflow Builder): `status === published` AND `enabled === true` AND `deleted_at IS NULL`.

**Visibility**:
- Admin (`agents:update`): all non-deleted by default; may include archived only if explicit filter
- Non-admin (`agents:read` only): `status === published` AND `deleted_at IS NULL` (enabled may be false — still visible, not assignable)

**State transitions (status)**:
- create → `draft`
- publish first version → `published`
- create parallel draft version → stays `published`
- soft-delete → `archived` (+ `deleted_at`)
- `enabled` true ↔ false at any non-archived status (idempotent)

---

### AgentVersion

Configuration snapshot for an Agent.

| Field | Type | Rules |
|-------|------|--------|
| id | uuid | PK |
| agent_id | uuid | FK → agents |
| version | int | monotonic per agent; start at 1 |
| status | enum | `draft` \| `published` |
| input_schema | jsonb | object; required non-empty on publish |
| output_schema | jsonb | object; required non-empty on publish |
| config_json | jsonb | object; default `{}` |
| timeout_ms | int | nullable; default e.g. 60000 when unset at publish |
| max_retries | int | nullable; default e.g. 0–3 |
| prompt_ref | string | nullable opaque code |
| tool_refs | jsonb | string[]; default `[]` |
| changelog | string | nullable |
| published_at | timestamptz | null while draft |
| created_by | uuid | nullable FK → users |
| created_at / updated_at | timestamptz | published rows: config fields immutable |

**Constraints**:
- Unique `(agent_id, version)`
- Partial unique: at most one `status=draft` per `agent_id`
- Published version: no in-place updates to schema/config/timeout/retries/refs

**Publish behavior**:
1. Validate draft version schemas
2. Set version `status=published`, `published_at=now`
3. Set agent `status=published`, `current_version=version`

**New version behavior** (from published agent):
1. Reject if draft version already exists
2. Copy current published snapshot into new version number `current_version+1` with `status=draft`
3. Agent remains `published`

---

## Indexes

- `agents.code` UNIQUE
- `agents(status, capability_type)` for list filters
- `agents(deleted_at)` / rely on soft-delete queries
- `agent_versions(agent_id, version)` UNIQUE
- Partial unique index on `agent_versions(agent_id)` WHERE `status = 'draft'`

## Seed rows (required)

| code | name | capability_type | status | enabled | version |
|------|------|-----------------|--------|---------|---------|
| `research-agent` | Research | research | published | true | 1 |
| `review-agent` | Review | review | published | true | 1 |

Minimal stub schemas, e.g. input `{ "type": "object" }`, output `{ "type": "object" }`.

## Validation rules (app layer)

- `code`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 64
- `name`: 1–120 chars
- Schema/config payload size cap (documented, e.g. 256KB)
- Invalid `capability_type` → 400
- Duplicate `code` → 409
- Mutate published version config → 409/422
- Non-admin draft access → 404
