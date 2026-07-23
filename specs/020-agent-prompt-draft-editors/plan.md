# Implementation Plan: Agent / Prompt Draft Editors — Simple Forms (FE-led)

**Branch**: `020-agent-prompt-draft-editors` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-agent-prompt-draft-editors/spec.md`

## Summary

Deliver **FE draft editors** for Prompts (template textarea) and Agents (flat field-list forms → JSON Schema) with New draft → Edit → Save → Publish. **Advanced JSON** is in MVP for Agent schemas (nested/complex). Prompt **variables form** is a fast follow (not MVP-blocking).

**BE in this repo**: FE contract pack for existing Agent/Prompt versioning + PATCH + publish surfaces; verify permission gates / error codes already match Auth + Registry/Library. **No new Nest CRUD modules.**

## Technical Context

**Language/Version**: TypeScript (contracts); NestJS Agent Registry + Prompt Library already shipped  
**Primary Dependencies**: `PATCH/POST` agents & prompts APIs (`002`, `006`); RBAC permissions `agents:*` / `prompts:*`  
**Storage**: Existing `agent_versions` / `prompt_versions` jsonb schemas & template  
**Testing**: Existing agents/prompts unit specs for update/publish/permissions; FE validates form UX in `ai-platform-fe`  
**Target Platform**: HTTP `/api/v1` + FE detail pages  
**Project Type**: Contract + FE feature (BE docs/contracts + permission verify for MVP)  
**Constraints**: Flat form types `string|number|boolean`; identifier field names; active-mode wins vs Advanced; no auto-fix Workflow mappings  
**Scale/Scope**: Platform designer ergonomics after Builder I/O mapping (`019`)

## Constitution Check

*GATE: Pass — reuses Agent/Prompt modules; Repository Pattern unchanged; no parallel edit APIs; contracts include OpenAPI + `types.ts` + `interfaces.ts` + `index.ts`.*

## Project Structure

### Documentation (this feature)

```text
specs/020-agent-prompt-draft-editors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agent-prompt-draft-editors-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
└── tasks.md
```

### Source Code

```text
# BE (MVP): no required Nest runtime changes
# Optional verify: agents.service / prompts.service permission + no-draft 409 codes
#   (document in contracts; add regression tests only if gaps found)

# FE (out of this repo): Agent/Prompt detail draft forms + Advanced JSON toggle
```

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|----------|------------|------------------------------|
| Contract-focused BE slice | FE needs typed draft lifecycle + schema helpers | New “schema editor” Nest module |
| Flat form + Advanced | Non-tech default + power-user nested schemas | Full visual JSON Schema builder |
| Variables form fast-follow | Shrink MVP to template + Agent I/O | Ship all Prompt metadata in one go |

## Phase 0 / 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
