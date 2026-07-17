# Research: Tool Library

**Feature**: `007-tool-library` | **Date**: 2026-07-15

## R1 — Versioning model (mirror Prompt / Agent Registry)

**Decision**: Tool row stays `status=published` after first publish. Config lives on `tool_versions`. At most one draft version per Tool (partial unique index). Publishing promotes the draft to immutable published and updates `tools.current_version`. Creating a new version does **not** change Tool status away from `published`.

**Rationale**: Spec US2 / FR-007–FR-008; same cognitive model as Prompt Library and Agent Registry.

**Alternatives considered**:
- Revert Tool to `draft` during edits → hides Tool from non-admins mid-lifecycle (rejected)
- Single mutable config row → no immutable history for future Execution pins (rejected)

## R2 — Disable vs archive

**Decision**: `enabled` boolean for **new assignment** eligibility; `status=archived` (+ soft `deleted_at`) for retirement from default catalogs. Disable does not change lifecycle status.

**Rationale**: Spec US4 / FR-011–FR-013; mirrors Prompt/Agent. Published + `enabled=false` remains readable (including for non-admins); new Agent `toolRefs` assignment blocked for that code.

**Alternatives considered**:
- `disabled` as status enum → conflates lifecycle with ops toggle (rejected)
- Hard delete → loses audit/history for stale Agent refs (rejected)

## R3 — Code uniqueness (active only; reuse after archive)

**Decision**: Enforce uniqueness of `code` among non–soft-deleted rows only via partial unique index `WHERE deleted_at IS NULL`. After archive, the same code MAY be registered on a new Tool.

**Rationale**: Spec FR-002 / FR-012; matches Prompt Library / Workflow Management, **not** Agent forever-unique codes.

**Alternatives considered**:
- Forever-unique like Agents → blocks code reuse after archive (rejected)
- Status-only soft hide without `deleted_at` → breaks BaseEntity soft-delete conventions (rejected)

## R4 — `toolRefs` resolution after code reuse

**Decision**: Lookup/assignment always resolves each code to the **current active** Tool (`deleted_at IS NULL`). Archived predecessors ignored. MVP stores codes only on Agents (no Tool id / version pin).

**Rationale**: Spec FR-016 / FR-019; keeps opaque string model simple.

**Alternatives considered**:
- Pin by Tool UUID on Agent → breaks opaque code contract (rejected for MVP)
- Resolve to archived row if assigned before reuse → dual meaning of same code (rejected)

## R5 — Immutable `tool_type`

**Decision**: `tool_type` is set at create on the Tool identity and MUST NOT change on update or new versions. To change type, archive and create a new Tool.

**Rationale**: Clarification 2026-07-15 / FR-001 / FR-005; preserves catalog filter stability and Agent expectations for a given code.

**Alternatives considered**:
- Editable on draft → type drift mid-lifecycle (rejected)
- Version-scoped type → same code means different capability over time (rejected for MVP)

## R6 — Plaintext secret rejection

**Decision**: On create/update/publish, reject config objects that contain known secret-shaped keys with plaintext values (case-insensitive key match for at least: `apiKey`, `api_key`, `password`, `token`, `secret`, `accessKey`, `access_key`, `privateKey`, `private_key`). Do **not** strip silently. Allow optional opaque `secretRef` string separately.

**Rationale**: Clarification 2026-07-15 / FR-015; prevents accidental credential storage in catalog.

**Alternatives considered**:
- Silent strip → hides mistakes from admins (rejected)
- Allow plaintext for MVP → security risk (rejected)

## R7 — `toolRefs` as unordered unique set with cap 20

**Decision**: Treat Agent `toolRefs` as an unordered unique set. Reject duplicate codes in one request. Cap at **20** codes per Agent version. System MAY normalize stored order (e.g. sort). Empty `[]` clears all; always allowed for authorized updaters.

**Rationale**: Clarifications 2026-07-15 / FR-016; order not significant until Execution defines invocation policy.

**Alternatives considered**:
- Preserve submission order → no consumer yet (deferred)
- No cap → unbounded payloads (rejected)
- Cap 5 → too tight for Milestone 2 multi-tool Agents (rejected)

## R8 — Draft visibility enforcement

**Decision**: After `tools:read` permission check, enforce catalog visibility in service: callers **without** `tools:update` only query `status=published` and **published** versions. Prefer `404` on draft get-by-id / get-by-code for non-admins. Non-admins **do** see published Tools with `enabled=false`.

**Rationale**: Spec FR-003 / FR-010; using `tools:update` as “full catalog” signal matches Prompt/Agent admin-matrix approach.

**Alternatives considered**:
- Separate `tools:read_drafts` → changes Auth seed (rejected for MVP)
- Hide `enabled=false` from non-admins → inconsistent with Prompt/Agent (rejected)

## R9 — Agent assignment validation (no SQL FK)

**Decision**: When AgentsService sets non-empty draft `toolRefs`, call exported Tools method `assertAssignableByCodes(codes: string[])`. Success only if every code resolves to an **active** Tool with `status=published`, `enabled=true`, unique, and `codes.length <= 20`. Clearing to `[]` always allowed. Historical Agent versions may retain stale codes; only **new** assignment is blocked.

**Rationale**: Spec US3 / FR-016; ARCHITECTURE loose coupling; Agents already store opaque `tool_refs` jsonb.

**Alternatives considered**:
- SQL FK / join table → cascade/cross-module pain + fails with code reuse (rejected)
- Validate only at Agent publish → weaker UX (deferred)
- Convenience assign endpoint on Tools → YAGNI; assignment stays on Agent PATCH (accepted)

## R10 — Config storage shape

**Decision**: Version payload: `config_json` (jsonb object, default `{}`), optional `input_schema` / `output_schema` (jsonb objects), optional `secret_ref` (varchar nullable), optional `timeout_ms` / `max_retries`, optional changelog. Empty/minimal config allowed at create and publish (stub tools OK). Enforce documented serialized size cap (e.g. 256KB) at DTO/service.

**Rationale**: Spec FR-015 / backlog; adapters not in scope — stubs need no live credentials.

**Alternatives considered**:
- Require non-empty config at publish → blocks stub seeds (rejected)
- Strict JSON Schema validation of input/output schemas in MVP → store as objects; deep schema validation later (accepted simplification)

## R11 — Sample seed + Agent wiring

**Decision**: Idempotent seed of four published Tools:

| code | tool_type |
|------|-----------|
| `web-search` | `search` |
| `web-browser` | `browser` |
| `image-generation` | `image_generation` |
| `object-storage` | `storage` |

Wire Agents: `research-agent.toolRefs` includes `web-search`; `review-agent.toolRefs` includes `object-storage`. Seed order: Tools after Agents tables exist; update Agent versions after Tools seed (same pattern as Prompt → Agent promptRef).

**Rationale**: Clarification 2026-07-15 / FR-018 / SC-007.

**Alternatives considered**:
- Seed Tools only without Agent wiring → fails FR-018 (rejected)
- Wire all four onto Research → heavier than needed (rejected in favor of Research+Review split)

## R12 — Module boundaries

**Decision**: New `ToolsModule` registered in `AppModule`. Controllers use `@Permissions('tools:*')`. AgentsModule imports ToolsModule for validation only. ToolsModule MUST NOT import Execution, Workflow Builder, or Prompts.

**Rationale**: ARCHITECTURE Tool Registry independence; Auth already seeds `tools:*` including `tools:publish`.

**Alternatives considered**:
- Fold into Agents module → conflates catalogs (rejected)
- Circular Agents ↔ Tools entity relations → avoid; service-level call only (accepted)
