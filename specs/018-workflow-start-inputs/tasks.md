# Tasks: Workflow Start Inputs + Builder I/O Mapping

**Input**: Design documents from `/specs/018-workflow-start-inputs/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

> BE Nest runtime changes are **out of scope for A.1**. Primary BE deliverable = FE contract pack.

## Phase 1: Contract pack (BE repo)

- [x] T001 Spec + clarifications from BACKLOG (`spec.md`, checklist)
- [x] T002 Plan / research / data-model / quickstart
- [x] T003 OpenAPI `contracts/workflow-start-inputs-api.yaml` (list/get/publish/definition/node/execute + policies)
- [x] T004 Typed FE contracts `types.ts` + `interfaces.ts` + `index.ts` (incl. `buildDynamicStartFields`)
- [x] T005 Link Spec on BACKLOG; note BE contracts ready / FE owns UI

## Phase 2: FE — US1 Workflow detail start keys (A.1) — `ai-platform-fe`

- [x] T006 Workflow detail: add/edit/remove `policies.requiredInputs` on draft → PUT definition
- [x] T007 Publish flow after save; verify published definition keys

## Phase 3: FE — US2 Modules dynamic form (A.1) — `ai-platform-fe`

- [x] T008 Resolve workflow by `code` via list; GET published definition
- [x] T009 Render text fields from `requiredInputs` (use `buildDynamicStartFields` or equivalent)
- [x] T010 POST execute with `{ input }`; surface requiredInputs validation errors
- [x] T011 Remove hardcoded field list as source of truth on ≥1 Modules operator (Trend Research)

## Phase 4: FE — US3 inputSchema widgets + US1b defaults (A.2) — `ai-platform-fe`

- [x] T012 Workflow detail: widget/options/label/placeholder → `policies.inputSchema` (no default required here)
- [x] T013 Builder: edit `inputSchema[key].default` only for existing keys → PUT definition
- [x] T014 Modules: map select/date/textarea; prefill `default`; unknown → text

## Phase 5: FE — US4 node I/O mapping (Phase B) — spun out

- [ ] T015 → moved to **`specs/019-node-io-mapping`** (Builder Node I/O Mapping)

## Dependency

T001–T005 (this repo) before FE T006+. T006–T007 before T008–T011. A.2 (T012–T014) after A.1.

**Status 2026-07-21:** A.1 + A.2 Done. Phase B tracked under `019-node-io-mapping`.
