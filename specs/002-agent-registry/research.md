# Research: Agent Registry

**Feature**: `002-agent-registry` | **Date**: 2026-07-14

## R1 — Versioning model (parallel draft while published)

**Decision**: Agent row stays `status=published` after first publish. Config lives on `agent_versions`. At most one draft version per agent; publishing promotes it to immutable published and updates `agents.current_version`.

**Rationale**: Spec clarification — designers keep seeing a stable published capability while admins prepare the next version. Matches Agent Replaceability without catalog flicker.

**Alternatives considered**:
- Revert Agent to `draft` during edits → hides Agent from non-admins mid-lifecycle (rejected)
- `pending_update` status → extra state without clear UX win (rejected)

## R2 — Disable vs archive

**Decision**: `enabled` boolean for assignability; `status=archived` (+ soft `deleted_at`) for retirement from default catalogs.

**Rationale**: Clarification — disable must not destroy “published” identity; archive is soft-delete semantics aligned with `BaseEntity.deletedAt`.

**Alternatives considered**:
- `disabled` as status enum value → conflates lifecycle with ops toggle (rejected)
- Hard delete → loses history for future Execution references (rejected)

## R3 — Draft visibility enforcement

**Decision**: Enforce in service layer after permission check: callers without admin mutate context (no `agents:update` / treat as catalog reader) only query `status=published` and published versions. Prefer `404` on draft get by id for non-admins to avoid existence leaks (consistent with “not found or forbidden”).

**Rationale**: Spec FR-017; `agents:read` alone is insufficient to see drafts. Using presence of `agents:update` (admin matrix) as “full catalog” signal avoids inventing a new permission.

**Alternatives considered**:
- Separate `agents:read_drafts` permission → changes Auth seed (rejected for MVP)
- Return 403 on draft get → slightly more informative leak (acceptable fallback; prefer 404)

## R4 — JSON contracts storage

**Decision**: Store `input_schema` / `output_schema` / `config_json` as PostgreSQL `jsonb`. Validate as non-empty objects on publish; optional lightweight size cap (e.g. 256KB serialized) in DTO/service.

**Rationale**: Workflow Builder later maps context via schemas; jsonb is idiomatic for TypeORM + Postgres and matches backlog.

**Alternatives considered**:
- Separate schema registry table → premature (rejected)
- Strict JSON Schema meta-validation library in MVP → optional later; publish only requires non-empty object (accepted simplification)

## R5 — Opaque prompt/tool refs

**Decision**: `prompt_ref` varchar nullable; `tool_refs` jsonb string array. No FK to future Prompt/Tool tables.

**Rationale**: Spec FR-013; Prompt/Tool libraries not built yet.

**Alternatives considered**: FK placeholders → migration churn when modules arrive (rejected)

## R6 — Sample seed

**Decision**: Idempotent seed upsert by `code` for `research-agent` and `review-agent` (names Research / Review), `status=published`, `enabled=true`, version 1 published with minimal input/output schema stubs.

**Rationale**: Clarification — required for MVP demos; mirrors Auth RBAC seed pattern.

**Alternatives considered**: Optional manual create only (rejected); env-gated production skip (defer — seed scripts are typically not run blindly in prod)

## R7 — Module boundaries

**Decision**: New `AgentsModule` only. Controllers use `@Permissions(...)`. No imports from future Workflow modules. Register in `AppModule`.

**Rationale**: ARCHITECTURE Agent Registry independence; Auth already seeds permissions.

**Alternatives considered**: Fold into a generic “registry” module → YAGNI (rejected)
