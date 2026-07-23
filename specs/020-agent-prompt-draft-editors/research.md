# Research: Agent / Prompt Draft Editors

**Feature**: `020-agent-prompt-draft-editors`  
**Date**: 2026-07-21

## R1 — Reuse existing APIs vs new endpoints

**Decision**: Reuse Agent Registry (`002`) and Prompt Library (`006`) endpoints only.

| Action | Agent | Prompt | Permission |
|--------|-------|--------|------------|
| Create draft version | `POST /agents/{id}/versions` | `POST /prompts/{id}/versions` | `*:update` |
| Load draft content | `GET .../versions/{version}` (use `draftVersion`) | same | `*:read` |
| Save draft content | `PATCH /agents/{id}` (`inputSchema`/`outputSchema`/…) | `PATCH /prompts/{id}` (`template`/…) | `*:update` |
| Publish | `POST /agents/{id}/publish` | `POST /prompts/{id}/publish` | `*:publish` |

**Rationale**: Versioning + immutability already implemented; BACKLOG forbids inventing parallel CRUD.

**Alternatives considered**: Dedicated “draft editor” resources — rejected (duplication).

## R2 — No-draft / immutable error codes (actual BE)

**Decision**: Document **actual** Nest codes in 020 contracts (do not invent new ones).

- Agent config PATCH with no draft → **409** `AGENT_NO_DRAFT_TO_PUBLISH` (message: create a new version first)
- Prompt content PATCH with no draft → **409** `PROMPT_VERSION_IMMUTABLE` (or equivalent existing path)
- Publish with no draft → **409** `AGENT_NO_DRAFT_TO_PUBLISH` / `PROMPT_NO_DRAFT_TO_PUBLISH`
- Missing permission → **403** `INSUFFICIENT_PERMISSIONS` / Forbidden envelope

**Rationale**: FE must branch UX on real codes; renaming codes is out of scope.

**Alternatives considered**: Introduce `AGENT_NO_DRAFT_TO_UPDATE` — deferred (breaking).

## R3 — Form → JSON Schema shape

**Decision**: MVP form field `{ name, type: 'string'|'number'|'boolean', required }` serializes to:

```json
{
  "type": "object",
  "required": ["…"],
  "properties": {
    "…": { "type": "string" }
  }
}
```

Deserialize: only flat top-level `properties` with simple `type` string enter the form; nested/`items`/`oneOf` stay Advanced-only with warning.

**Rationale**: Clarifications Q1 + Q4; matches BACKLOG UX contract.

**Alternatives considered**: Full JSON Schema builder — out of scope.

## R4 — Active mode vs merge

**Decision**: Active (visible) editor wins on Save; dirty mode switch prompts discard/apply.

**Rationale**: Clarification Q3; avoids silent dual-buffer bugs.

## R5 — MVP vs fast follow

**Decision**:

| In MVP | Fast follow |
|--------|-------------|
| Prompt template form | Prompt variables form (US4) |
| Agent I/O field forms + Advanced JSON | Output-rename → Builder mapping reminder (US5) |
| Draft → Save → Publish lifecycle + permissions | Auto-fix Workflow `outputMapping` (never in scope) |

**Rationale**: Clarification Q2 + FR-014.

## R6 — Contract pack strategy

**Decision**: New pack under `specs/020-…/contracts/` that **subsets** draft-edit operations from `002`/`006` and adds FE helper types (`SchemaField`, serialize/deserialize). Canonical full catalogs remain in `002`/`006`; 020 is the FE-facing “draft editor” slice (same pattern as `018`/`019`).

**Alternatives considered**: Only point FE at `002`/`006` without helpers — rejected (form serialization needs shared helpers in contracts).
