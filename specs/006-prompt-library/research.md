# Research: Prompt Library

**Feature**: `006-prompt-library` | **Date**: 2026-07-15

## R1 — Versioning model (mirror Agent Registry)

**Decision**: Prompt row stays `status=published` after first publish. Content lives on `prompt_versions`. At most one draft version per Prompt (partial unique index). Publishing promotes the draft to immutable published and updates `prompts.current_version`. Creating a new version does **not** change Prompt status away from `published`.

**Rationale**: Spec US2 / FR-007–FR-008; aligns cognitive model with Agent Registry so admins prepare the next snapshot while non-admins keep seeing the current published catalog entry.

**Alternatives considered**:
- Revert Prompt to `draft` during edits → hides Prompt from non-admins mid-lifecycle (rejected)
- Single mutable “current content” row → no immutable history for future Execution pins (rejected)

## R2 — Disable vs archive

**Decision**: `enabled` boolean for **new assignment** eligibility; `status=archived` (+ soft `deleted_at`) for retirement from default catalogs. Disable does not change lifecycle status.

**Rationale**: Spec US4 / FR-011–FR-013; mirrors Agent Registry. Published + `enabled=false` remains readable (including for non-admins); new Agent `promptRef` assignment blocked.

**Alternatives considered**:
- `disabled` as status enum value → conflates lifecycle with ops toggle (rejected)
- Hard delete → loses audit/history for stale Agent refs (rejected)

## R3 — Code uniqueness (active only; reuse after archive)

**Decision**: Enforce uniqueness of `code` among non–soft-deleted rows only via partial unique index `WHERE deleted_at IS NULL`. After archive, the same code MAY be registered on a new Prompt.

**Rationale**: Clarification 2026-07-15; matches Workflow Management, **not** Agent Registry’s forever-unique codes. Enables intentional replacement of a retired prompt identity under the same consumer-facing code.

**Alternatives considered**:
- Forever-unique like Agents → blocks code reuse after archive (rejected by clarification)
- Status-only soft hide without `deleted_at` → breaks platform BaseEntity / soft-delete conventions (rejected)

## R4 — `promptRef` resolution after code reuse

**Decision**: Lookup/assignment always resolves `promptRef` to the **current active** Prompt with that `code` (`deleted_at IS NULL`). Archived predecessors with the same historical code are ignored. MVP stores code only on Agents (no Prompt id / version pin).

**Rationale**: Clarification 2026-07-15 / FR-016 / FR-019; keeps opaque string model simple. Future Execution can add version pins later without changing assignment key today.

**Alternatives considered**:
- Pin by Prompt UUID on Agent → breaks “opaque code” contract and forces FK-like coupling (rejected for MVP)
- Resolve to archived row if Agent was assigned before reuse → surprising dual meaning of same code (rejected)

## R5 — Empty content on create vs publish

**Decision**: Create may persist empty `template` and empty/absent `messages` (draft shell). Publish MUST reject when neither usable template nor usable messages exist (non-empty trimmed template **or** non-empty messages array with at least one message having non-empty content).

**Rationale**: Clarification 2026-07-15 / FR-001 / FR-006; allows admins to reserve a code/metadata early, then fill content before publish.

**Alternatives considered**:
- Require content at create → slows catalog bootstrap (rejected)
- Allow publish with empty content → Ambiguous for Execution consumers (rejected)

## R6 — Draft visibility enforcement

**Decision**: After `prompts:read` permission check, enforce catalog visibility in service: callers **without** `prompts:update` only query `status=published` and **published** versions. Prefer `404` on draft get-by-id / get-by-code for non-admins. Non-admins **do** see published Prompts with `enabled=false`.

**Rationale**: Spec FR-003 / FR-010; clarification 2026-07-15 on disabled visibility. Using `prompts:update` as “full catalog” signal matches Agent Registry’s admin-matrix approach and avoids a new Auth permission.

**Alternatives considered**:
- Separate `prompts:read_drafts` → changes Auth seed (rejected for MVP)
- Hide `enabled=false` from non-admins → rejected by clarification (assignment still blocked)

## R7 — Agent assignment validation (no SQL FK)

**Decision**: When AgentsService sets a non-empty draft `promptRef`, call an exported Prompts read method (e.g. `assertAssignableByCode(code)`). Success only if an **active** Prompt exists with that code, `status=published`, `enabled=true`. Clearing to `null` always allowed. Historical Agent versions may retain stale codes after later disable/archive; only **new** assignment is blocked.

**Rationale**: Spec US3 / FR-016; backlog + ARCHITECTURE loose coupling; Prompt Library did not exist when Agents stored opaque refs.

**Alternatives considered**:
- SQL FK from `agent_versions.prompt_ref` → `prompts.code` → cascade/cross-module pain + fails with code reuse (rejected)
- Validate only at Agent publish time → allows bad drafts and weaker UX (deferred; MVP validates on set)
- Convenience assign endpoint on Prompts → YAGNI; assignment stays on existing Agent PATCH (accepted)

## R8 — Content storage shape

**Decision**: Version payload: nullable `template` (text), nullable `messages` (jsonb chat-style array `{ role, content }[]`), optional `variables_schema` (jsonb object), optional `model_hints` (jsonb object — metadata only). Enforce documented serialized size cap (e.g. 256KB) at DTO/service.

**Rationale**: Spec FR-015 / backlog; supports both single-string prompts and multi-message chat layouts without inventing a runtime renderer.

**Alternatives considered**:
- Template-only storage → rejects structured system/user packs (rejected)
- Strict JSON Schema validation of `variables_schema` in MVP → optional later; store as object (accepted simplification)

## R9 — Sample seed + Agent wiring

**Decision**: Idempotent seed of ≥1 published Prompt (recommended code `research-brief`) with non-empty template and/or messages. MUST update ≥1 sample Agent (e.g. `research-agent`) so its published version `prompt_ref` = that code. Seed order: Prompts after Agents tables exist, or update Agents after Prompts seed within the same seed runner.

**Rationale**: Clarification 2026-07-15 / FR-018 / SC-007; enables demos without manual create.

**Alternatives considered**:
- Seed Prompt only without Agent wiring → fails FR-018 (rejected)
- Env-gated production skip (defer — same policy as other seeds)

## R10 — Module boundaries

**Decision**: New `PromptsModule` registered in `AppModule`. Controllers use `@Permissions('prompts:*')`. AgentsModule imports PromptsModule (or a shared read token) for validation only. No imports from Execution, Workflow Builder, or Tools.

**Rationale**: ARCHITECTURE Prompt Registry independence; Auth already seeds `prompts:*`.

**Alternatives considered**:
- Fold into Agents module → conflates catalogs (rejected)
- Circular Agents ↔ Prompts entity relations → avoid; service-level call only (accepted)
