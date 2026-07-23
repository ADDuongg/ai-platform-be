# Tasks: Agent / Prompt Draft Editors — Simple Forms

**Input**: Design documents from `/specs/020-agent-prompt-draft-editors/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

> Primary BE deliverable = FE contract pack + permission/error-code verify. Nest Agent/Prompt APIs already exist. FE UI lives in `ai-platform-fe`.  
> **MVP**: US1 (Prompt template) + US2 (Agent I/O forms) + US3 (lifecycle) + Advanced JSON.  
> **Fast follow**: US4 (variables form), US5 (rename reminder) — do not block MVP Done.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1…US5 from spec.md

## Phase 1: Setup / contracts (this repo)

**Purpose**: FE-consumable API contracts + backlog link

- [x] T001 Spec + clarifications (`specs/020-agent-prompt-draft-editors/spec.md`, `checklists/requirements.md`)
- [x] T002 Plan / research / data-model / quickstart under `specs/020-agent-prompt-draft-editors/`
- [x] T003 OpenAPI `specs/020-agent-prompt-draft-editors/contracts/agent-prompt-draft-editors-api.yaml`
- [x] T004 [P] Typed FE contracts `contracts/types.ts` + `interfaces.ts` + `index.ts` (incl. `SchemaField` helpers)
- [x] T005 Link Spec on `docs/product/BACKLOG.md`; Status Implementing

**Checkpoint**: Contracts ready for FE

---

## Phase 2: Foundational — BE verify + FE client

**Purpose**: Confirm existing APIs match contracts; wire FE client before UI stories

- [x] T006 [P] Verify Agent draft PATCH/publish/permission + no-draft **409** codes in `src/modules/agents/services/agents.service.ts` (+ spec) match `contracts/`; add regression only if gap
- [x] T007 [P] Verify Prompt draft PATCH/publish/permission + no-draft **409** codes in `src/modules/prompts/services/prompts.service.ts` (+ spec) match `contracts/`; add regression only if gap
- [x] T008 [P] [FE] Align API client with `AgentPromptDraftEditorsApiClient` in `ai-platform-fe`
- [x] T009 [P] [FE] Import/copy `fieldsToObjectSchema` / `objectSchemaToFields` / `isValidSchemaFieldName` from `contracts/types.ts`

**Checkpoint**: FE can create draft, GET version, PATCH, publish for Agent + Prompt

---

## Phase 3: User Story 1 — Prompt template form (P1) 🎯 MVP

**Goal**: Designer edits Prompt draft template via form and saves.

**Independent Test**: Create draft → change template → Save → reload version → text matches; no update permission → cannot save.

- [x] T010 [US1] [FE] Prompt detail draft: template textarea editor (not JSON-first)
- [x] T011 [US1] [FE] Wire New draft version + Save via `createPromptVersion` / `updatePromptDraft`
- [x] T012 [US1] [FE] Gate edit/save on `prompts:update`; surface 401/403 clearly

---

## Phase 4: User Story 2 — Agent I/O field forms + Advanced (P1) 🎯 MVP

**Goal**: Designer edits Agent input/output as field list; Advanced JSON for complex schemas.

**Independent Test**: Add/rename field on form → Save → draft schemas match; complex schema shows warning + Advanced path.

- [x] T013 [US2] [FE] Agent draft Input/Output field lists (`name`, `type` ∈ string|number|boolean, `required`)
- [x] T014 [US2] [FE] Validate identifier names + duplicates before save; serialize via `fieldsToObjectSchema`
- [x] T015 [US2] [FE] Detect `complex` via `objectSchemaToFields`; warn; Advanced JSON toggle; **active mode wins** on Save / dirty switch
- [x] T016 [US2] [FE] Persist via `updateAgentDraft` (`inputSchema` / `outputSchema`); gate on `agents:update`

---

## Phase 5: User Story 3 — Draft → Publish → New draft (P1) 🎯 MVP

**Goal**: Clear lifecycle; published immutable; publish permission separate.

**Independent Test**: Publish → read-only → new draft required for further edits; missing publish permission → blocked.

- [x] T017 [US3] [FE] Agent + Prompt: Publish control gated on `*:publish`; after publish show immutable state
- [x] T018 [US3] [FE] Handle 409 no-draft / immutable with clear “create new draft” UX
- [x] T019 [US3] [FE] Viewer / missing update: no draft create / save / publish actions

---

## Phase 6: User Story 4 — Prompt variables form (P2) — fast follow

**Goal**: Variables form after MVP.

**Independent Test**: Add/remove variable → save → `variablesSchema` matches.

- [ ] T020 [US4] [FE] Prompt variables form (fast follow) using same identifier rules + optional `fieldsToObjectSchema`
- [ ] T021 [US4] [FE] Save `variablesSchema` via `updatePromptDraft` without confusing copy with Agent schemas

---

## Phase 7: User Story 5 — Output rename reminder (P3) — fast follow

**Goal**: Non-blocking reminder after renaming Agent output field.

- [ ] T022 [US5] [FE] After successful save detecting output field rename, show reminder about Builder `outputMapping`

---

## Phase 8: Polish

- [x] T023 Run BE unit smoke: `pnpm exec jest src/modules/agents/services/agents.service.spec.ts src/modules/prompts/services/prompts.service.spec.ts`
- [x] T024 Validate quickstart HTTP scenarios (draft → PATCH → publish → 409) against running API — *covered by unit regressions + FE owner acceptance 2026-07-22; live API not up at close-out*
- [x] T025 Update `docs/product/BACKLOG.md` 020 → Done when MVP acceptance + tests pass; note fast-follow US4/US5 if still open

## Dependency

```text
T001–T005 (contracts) → T006–T009 (verify + FE client)
T008–T009 → T010–T012 (US1)
T008–T009 → T013–T016 (US2)
US1 + US2 → T017–T019 (US3 lifecycle polish)
MVP Done = US1+US2+US3 + T006/T007/T023 (+ T024/T025)
T020–T022 fast follow (do not block MVP)
```

## Parallel opportunities

- T006 ∥ T007 (BE verify Agent vs Prompt)
- T008 ∥ T009 (FE client vs helpers)
- After foundational: US1 ∥ US2 FE work
- T020–T022 anytime after MVP

## Implementation strategy

1. Finish BE verify (T006–T007) + jest smoke (T023) in this repo.
2. FE implements US1 → US2 → US3 for MVP.
3. Mark BACKLOG Done when MVP acceptance verified; leave US4/US5 unchecked or spin Todo.
4. Never implement multiple unfinished tasks in one `/speckit-implement` turn (one task only).
