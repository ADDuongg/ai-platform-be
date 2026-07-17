# Readability Refactor Plan

This document is **code readability only** — how to make existing files easier to read.

It is **not** a structural cleanup plan. For dead-code removal, file merges, module wiring, and folder deletion, see [`CLEANUP_PLAN.md`](./CLEANUP_PLAN.md).

---

## Scope

**In scope**
- Rename for intent
- Flatten nesting; prefer early returns
- Remove WHAT comments; keep WHY comments
- Inline one- or two-line helpers that add indirection
- Extract meaningful helpers *within the same file*
- Deduplicate repeated blocks *within the same file*
- Reorder code top-to-bottom (imports → public API → private helpers → file-local utilities)
- Remove dead branches and misleading comments

**Out of scope**
- Splitting or merging files
- New folders, patterns, factories, strategies
- Cross-module shared utilities (that belongs in `CLEANUP_PLAN.md` Phase 4 if ever needed)
- Feature changes or behavior changes
- Architecture refactors

**Rule of thumb:** another engineer should open a file and think *"this is simple"*, not *"this is clever"*.

---

## How to work through this plan

For **each file**, before editing:

1. Read the "Hard to read because" section.
2. Apply only the listed actions for that file.
3. Run `pnpm lint && pnpm test` (add `pnpm build` for module/provider changes).
4. Mark the file done in the checklist at the bottom.

Work **one file at a time**. Do not batch unrelated files.

---

## Completed

These files were already refactored for readability:

| File | What changed |
|------|--------------|
| `src/modules/executions/llm/llm-agent-runner.service.ts` | Removed mutable `lastEnrichmentBundle` side effect; `maybeEnrichWithTools` returns `{ messages, enrichmentBundle }`; extracted `buildPromptMessages`, `buildToolEnrichmentMessage`; flattened `invoke()`; deduped config resolution via `firstTrimmedString` / `firstNumber` / `hasVariableValue` |
| `src/modules/executions/tools/tool-invoker.service.ts` | Extracted `invokeTool()` from loop; `resolveVersionLimits()` for timeout/retry defaults; clearer names (`codes`, `priorItems`, `chainedUrl`); web-browser skip returns early |
| Priority 1 files | Orchestrator, json-output.parser, workflow-builder, workflow-definition.validator |
| Priority 2 files | executions.service, reference-url.sanitizer, object-storage/web-search/image-generation adapters, ollama-chat.provider, executions.module |
| Priority 3 files | agents.service, prompts.service, tools.service, workflows.service |
| Priority 4 files | auth.service, users.service, users.repository, json-size.util, global-exception.filter, permissions.guard, redis.service |
| Priority 5 files | roles.controller DTO move, users.controller DTO + requestMeta, roles.service WHY comment, executions assertInputSize |

---

## Priority 1 — Highest impact ✅ DONE

### `src/modules/executions/services/execution-orchestrator.service.ts` ✅

**Hard to read because**
- Two nested `while (true)` loops with repeated DB reloads.
- Terminal execution state (`status`, `completedAt`, `errorJson`, `save`) is copy-pasted five times.
- `steps.splice(0, steps.length, ...refreshed)` is harder to follow than reassignment.
- Non-null assertions on `findById` hide missing-entity handling.
- Dead code: `RETRYING` is set then immediately overwritten to `RUNNING` (lines 161–164).
- Magic string outcomes (`'failed_terminal'`, `'cancelled'`) without a named type at the top.

**Refactor actions**
- [x] Add a file-local type alias, e.g. `type StepRunOutcome = 'completed' | 'failed_terminal' | 'cancelled'`.
- [x] Add private `markExecutionTerminal(execution, status, errorJson?)` to collapse the five save blocks.
- [x] Add private `reloadExecution(id)` that throws/returns early if missing — drop `!` assertions.
- [x] Replace `steps.splice(...)` with `let steps = ...` and `steps = refreshed`.
- [x] Remove dead RETRYING branch in `runStep`; set `RUNNING` directly on first attempt.
- [x] Extract `isExecutionCancelled(execution)` guard; call at top of each loop iteration.
- [x] Rename `outcome` → `stepRunOutcome`, `latest` → `currentExecution`.
- [x] Remove WHAT comments: `// Loop until terminal`, `// Refresh steps list after mutation`.
- [x] Keep WHY: deadlock case (line 96), agent re-check on retry (line 175).

---

### `src/modules/executions/services/json-output.parser.ts` (~1172 lines) ✅

**Hard to read because**
- File is long; many normalize functions repeat the same shape: guard object → coerce `summary` → loop keys through `normalizeLabeledNotesList`.
- Terse loop variables (`n`, `g`, `r`, `ch`) in functions longer than a few lines.
- WHAT comments inside normalize functions restate the code.
- Private helpers are far from their first consumer — high scroll cost.

**Refactor actions** (within-file only; do not split the file)
- [x] Add file-local `coerceSummaryString(value)` — used in ~6 normalize functions.
- [x] Add file-local `normalizeSummaryAndLabeledLists(obj, listKeys[])` for the repeated normalize pattern.
- [x] Expand loop vars to domain names where scope is >3 lines: `note`, `group`, `report`.
- [x] Trim per-branch WHAT comments in `parseModelJsonObject`; keep one WHY block above the candidate loop.
- [x] Keep WHY comments: file header (lines 10–18), duplicate-key recovery guard, envelope-wrapping rationale, schema-coercion intent.
- [ ] Reorder private helpers adjacent to first consumer (no new files) — deferred; helpers placed before handoff normalizers.
- [x] Leave `normalizeFashionHandoffShapes` explicit chain as-is — it documents execution order.

---

### `src/modules/workflows/services/workflow-builder.service.ts` ✅

**Hard to read because**
- Five mutation methods (`addNode`, `updateNode`, `removeNode`, `addEdge`, `removeEdge`) repeat the same flow: load draft → clone/coerce definition → mutate → validate → save → return DTO.
- `cloneDefinition(coerceLoose(...))` is copy-pasted at the top of each method.

**Refactor actions**
- [x] Add private `loadDraftDefinition(draft): WorkflowDefinition`.
- [x] Add private `persistDefinition(workflowId, draft, definition): Promise<WorkflowDefinitionResponseDto>` (validate + save + DTO).
- [x] Each mutation becomes: get draft → load definition → one change → `return persistDefinition(...)`.
- [x] In `getDefinition`, use early returns instead of nested `if (includeDrafts)`.

---

### `src/modules/workflows/services/workflow-definition.validator.ts` ✅

**Hard to read because**
- `validate()` is ~140 lines mixing shape checks, node parsing, edge parsing, cycle detection, size checks, and agent lookups.
- `parseNode()` uses 4-level nested ternaries for `agentVersion` and `label`.
- `createNodeId` and `createEdgeId` are identical.
- Duplicate-ID loops for nodes and edges follow the same pattern.

**Refactor actions**
- [x] Split `validate()` into private steps: `assertDefinitionShape`, `parseNodes`, `parseEdges`, `assertAcyclic`, `assertPayloadSize`, `assertAgentsAssignable`.
- [x] Replace nested ternaries with existing `optionalNumber` + a file-local `optionalString(raw)`.
- [x] Merge `createNodeId` / `createEdgeId` → `createId(explicit?: string)`.
- [x] Extract file-local duplicate check helper for node/edge ID loops.

---

## Priority 2 — Executions module (remaining) ✅ DONE

### `src/modules/executions/services/executions.service.ts` ✅

**Hard to read because**
- `resolveAgentPin(..., requirePublishedVersion)` — third condition always checks `PUBLISHED`, making the boolean flag misleading.
- `retry()` comment contradicts itself: "keep attempt count" then `step.attempt = 0`.
- Speculative comment block (lines 153–154) reads like unresolved design notes.
- Step field reset in `retry()` is a 7-line nulling block.

**Refactor actions**
- [x] Remove unused `requirePublishedVersion` param or rename method to reflect that published is always required; simplify condition at lines 305–308.
- [x] Rewrite retry comment: "Reset attempt so manual retry gets a fresh auto-retry budget."
- [x] Delete speculative comment block (lines 153–154) or replace with one WHY line on the `failedSteps` filter if needed.
- [x] Remove WHAT comment at line 140.
- [x] Rename `emptyGraph` → `hasNoNodes` (or invert to `hasNodes` and flip branches for clearer polarity).
- [x] Group step reset fields into a local `resetStepForRetry(step)` private method.

---

### `src/modules/executions/tools/reference-url.sanitizer.ts` ✅

**Hard to read because**
- Recursive walkers use terse names (`n`, `into`, `a`, `b`).
- JSDoc says "mutates a clone" but nested arrays are mutated in place — contract is unclear.
- `pickFirstHttpUrl` builds a full `Set` to return one URL.

**Refactor actions**
- [x] Rename `n` → `normalizedUrl`, `into` → `allowedUrls`, `a`/`b` → `candidateUrl`/`allowedUrl`.
- [x] Fix JSDoc to state nested mutation of a top-level clone.
- [x] Simplify `pickFirstHttpUrl` to early-return walk, or rename to `findFirstHttpUrl` if Set is kept for a documented reason.
- [x] Remove WHAT comment on trailing-slash normalization (line ~52).
- [x] Keep WHY comments on allowlist policy (lines ~103, 108, 138).

---

### `src/modules/executions/tools/adapters/object-storage.adapter.ts` ✅

**Hard to read because**
- `putObject` and `getObject` duplicate identical path resolution (lines ~38–44 and ~73–79).
- `abs` is abbreviated; `encodeContent` has redundant branches for `content` vs `text`.

**Refactor actions**
- [x] Extract file-local `resolveStoragePath(root, input) → { safeRel, absolutePath, executionId }`.
- [x] Rename `abs` → `absolutePath`.
- [x] Combine string branches in `encodeContent` where both produce UTF-8 `text/plain`.
- [x] Keep WHY comments on default-operation inference.

---

### `src/modules/executions/tools/adapters/web-search.adapter.ts` ✅

**Hard to read because**
- File is long; fashion query templates are inline array joins.
- `str()` is too generic for a file-level helper.
- `source` is reassigned inside the query loop.

**Refactor actions**
- [x] Rename `str()` → `asTrimmedString()` or `trimmedString()`.
- [x] Extract fashion query template strings as named constants in `buildSearchQueries`.
- [x] Rename `usedQuery` → `activeQuery`; use `successfulSource` instead of reassigning `source`.
- [x] Remove WHAT comment at line ~221 (regex name is enough).
- [x] Keep WHY on silent encoding catch (line ~241).

---

### `src/modules/executions/tools/adapters/image-generation.adapter.ts` ✅

**Hard to read because**
- Nested ternary prompt fallback chain in `invoke`.
- `hash` in `buildStubPreviewDataUrl` suggests crypto; it is a color seed.

**Refactor actions**
- [x] Extract file-local `resolvePrompt(input): string`.
- [x] Rename `hash` → `colorSeed`.
- [x] Remove WHAT comment at line ~27.

---

### `src/modules/executions/llm/ollama-chat.provider.ts` ✅

**Hard to read because**
- Request body construction is mixed with HTTP transport.
- Timeout detection uses fragile string matching on error messages.
- `runnerCfg` is abbreviated.

**Refactor actions**
- [x] Extract file-local `buildOllamaRequestBody(request)`.
- [x] Use typed timeout check (`error.name === 'TimeoutError'` or abort cause) instead of string includes.
- [x] Rename `runnerCfg` → `agentRunnerConfig`.
- [x] Keep WHY comment on schema vs bare JSON precedence.

---

### `src/modules/executions/executions.module.ts` ✅

**Hard to read because**
- File-wide `eslint-disable` may exist only for one cast.
- Provider factory lambdas add visual noise inside `@Module({ providers })`.

**Refactor actions**
- [x] Narrow or remove file-wide eslint-disable; use a type guard for `resolveRunnerMode` if needed.
- [x] Move factory bodies to named functions in the same file: `createLlmChatProvider`, `createAgentRunner`.

---

## Priority 3 — Catalog services ✅ DONE

Apply the **same within-file pattern** independently in each file. Do not create a shared base class or cross-module helper layer.

### `src/modules/agents/services/agents.service.ts` ✅

**Hard to read because**
- `enable()` / `disable()` differ only by `enabled = true|false`.
- `findById`, list mapper, and post-update return repeat draft-fetch → `toAgentDto(agent, draft?.version)`.
- `assertSchemaPayloadSize` is a one-line passthrough to `assertJsonPayloadSize`.
- JSDoc on `assertAssignableByCode` restates the signature.

**Refactor actions**
- [x] Add private `setEnabled(id, enabled)`.
- [x] Add private `toAgentDtoWithDraft(agent, permissions)`.
- [x] Inline `assertSchemaPayloadSize` → `assertJsonPayloadSize`.
- [x] Reuse `draft` from update branch for final DTO instead of re-fetching.
- [x] Trim WHAT JSDoc.

---

### `src/modules/prompts/services/prompts.service.ts` ✅

**Hard to read because**
- `findById` and `findByCode` are nearly identical.
- `enable()` / `disable()` duplicate pair.
- `assertAssignableByCode` and `resolvePublishedByCode` repeat published+enabled checks with different error types.
- JSDoc describes callers ("Used by AgentsService") rather than rules.

**Refactor actions**
- [x] Add private `findVisibleByCode(code, permissions)`; keep `findById` parallel or add `findVisible(id, permissions)`.
- [x] Add private `setEnabled(id, enabled)`.
- [x] Add private `loadPublishedPrompt(code)` shared by assignability and resolve paths; each caller wraps with its error style (`AppException` vs `Error`).
- [x] Trim "Used by X" JSDoc lines.

---

### `src/modules/tools/services/tools.service.ts` ✅

**Hard to read because**
- Same find/enable/disable duplication as prompts.
- `assertAssignableByCodes` loop duplicates single-tool logic.
- `scanForSecretKeys` depth guards read like an off-by-one puzzle (`depth > 1` vs `depth < 1`).
- `assertPayloadSize` is a thin wrapper.

**Refactor actions**
- [x] Same `findVisible*` / `setEnabled` extractions as prompts.
- [x] Extract private `assertAssignableByCode(code)`; loop in `assertAssignableByCodes`.
- [x] Rewrite depth logic: `const MAX_DEPTH = 1; if (depth >= MAX_DEPTH) return;`.
- [x] Inline `assertPayloadSize` → `assertJsonPayloadSize(..., { skipNull: true })`.

---

### `src/modules/workflows/services/workflows.service.ts` ✅

**Hard to read because**
- `normalizeDefinition` overlaps conceptually with validator's `coerceLoose` / `cloneDefinition`.
- `resolveCloneSourceVersion` has a nested fallback chain (requested → published → draft).
- `assertDefinitionPayloadSize` is a one-line wrapper.
- `update()` re-fetches draft after save when draft was already loaded.

**Refactor actions**
- [x] Rename `normalizeDefinition` → `coerceDefinition`; one-line WHY that validator owns strict parsing.
- [x] Refactor `resolveCloneSourceVersion` with early returns and labeled steps.
- [x] Inline `assertDefinitionJsonPayloadSize` at call sites.
- [x] Reuse loaded `draft` in `update()` return path.

---

## Priority 4 — Auth, users, common, infrastructure ✅ DONE

### `src/modules/auth/services/auth.service.ts` ✅

**Hard to read because**
- `configService.get('jwt', { infer: true })` repeated in ~8 places.
- `refresh()` is a long guard chain without visual grouping.
- `forgotPassword()` has dead `void jwt` and magic `ttlSeconds = 3600`.
- Cookie options duplicated between `setRefreshCookie` and `clearRefreshCookie`.

**Refactor actions**
- [x] Add private `jwtSettings()`.
- [x] Add private `refreshCookieOptions()` shared by set/clear.
- [x] Group `refresh()` guards into `validateRefreshToken(existing)` and `validateActiveUser(user)`.
- [x] Remove `void jwt`; name constant `PASSWORD_RESET_TTL_SECONDS = 3600` or use jwt config.
- [x] Keep behavior identical for cookie `maxAge` / `expires`.

---

### `src/modules/users/services/users.service.ts` ✅

**Hard to read because**
- "Cannot remove last super_admin" guard duplicated in `softDelete` and `updateRoles`.
- `findById`, `update`, `softDelete`, `updateRoles` each repeat the same not-found throw.
- `toDto` parameter type is a long `NonNullable<Awaited<ReturnType<...>>>`.

**Refactor actions**
- [x] Add private `requireUser(id)`.
- [x] Add private `assertCanDemoteSuperAdmin(userId)`.
- [x] Simplify `toDto(user: UserEntity)` if entity type suffices.

---

### `src/modules/users/repositories/users.repository.ts` ✅

**Hard to read because**
- `countActiveSuperAdmins` hardcodes `'super_admin'` and `'active'` while the codebase uses `ROLES.SUPER_ADMIN` and `UserStatus.ACTIVE`.

**Refactor actions**
- [x] Import and use `ROLES` and `UserStatus` in query `where` clauses.

---

### `src/common/utils/json-size.util.ts` ✅

**Hard to read because**
- `assertDefinitionJsonPayloadSize` duplicates `assertJsonPayloadSize` logic; only the field name differs.

**Refactor actions**
- [x] Implement as `assertJsonPayloadSize(value, 'definition')`; delete duplicate function.
- [x] Update call sites in workflow files (same message text must be preserved).

---

### `src/common/filters/global-exception.filter.ts` ✅

**Hard to read because**
- `normalizeException` for `HttpException` uses nested ternary for validation vs generic messages.

**Refactor actions**
- [x] Extract private `formatHttpExceptionBody(status, body)` with early branch for `isValidation`.

---

### `src/common/guards/permissions.guard.ts` ✅

**Hard to read because**
- After `user?.permissions?.length` check, line ~42 uses `user.permissions!` non-null assertion.

**Refactor actions**
- [x] Assign `const permissions = user.permissions ?? []` after guard; use `permissions.includes(perm)`.

---

### `src/infrastructure/redis/redis.service.ts` ✅

**Hard to read because**
- `subscribe()` adds a new `'message'` listener on every call — unclear if re-subscribe is safe.
- `reconnectOnError` callback is inline inside options object.

**Refactor actions**
- [x] Extract private `shouldReconnectOnError(err: Error): boolean`.
- [x] Add one-line WHY on `subscribe`: "caller should subscribe once per channel", or guard with instance `Set` of channels.

---

## Priority 5 — Minor / optional ✅ DONE

### `src/modules/auth/controllers/roles.controller.ts` ✅

- [x] Move inline `UpdateRolePermissionsDto` below the controller class, or to existing `dto/` folder so the controller file leads with routing.

### `src/modules/users/controllers/users.controller.ts` ✅

- [x] Move inline `ListUsersQueryDto` to existing `dto/` folder.
- [x] Add private `requestMeta(req)` if `{ ip, userAgent }` construction grows.

### `src/modules/auth/services/roles.service.ts` ✅

- [x] Align `PermissionResponse.description` with entity field `name`, or add WHY inline on the mapping.

### `src/modules/executions/services/executions.service.ts` — `assertInputSize` ✅

- [x] Could call `jsonPayloadByteSize` from `@common/utils` for consistency (same threshold logic); keep identical error message.

---

## Already clean — skip

No readability pass needed unless you touch the file for other reasons:

| File | Why it's fine |
|------|---------------|
| `src/modules/executions/processors/execution.processor.ts` | 29 lines, single job handler |
| `src/modules/executions/services/workflow-engine.service.ts` | Small, clear graph helpers |
| `src/modules/executions/services/stub-agent-runner.service.ts` | Linear `invoke`; fixtures extracted |
| `src/modules/executions/services/context-mapper.ts` | Symmetric mapping functions |
| `src/modules/executions/services/required-inputs.ts` | Straight validation loop |
| `src/modules/executions/tools/tool-registry.ts` | 18 lines |
| `src/modules/executions/tools/adapters/web-browser.adapter.ts` | Well-factored helpers |
| `src/modules/executions/llm/openai-chat.provider.ts` | Placeholder stub |
| `src/modules/executions/llm/gemini-chat.provider.ts` | Placeholder stub |
| `src/modules/executions/constants/executions.constants.ts` | Flat grouped constants |
| `src/modules/executions/controllers/*.ts` | Thin HTTP layer |
| `src/modules/*/controllers/*.ts` (catalog) | Thin HTTP layer |
| `src/modules/*/repositories/*.ts` | Query-focused, minimal logic |
| `src/common/utils/catalog-access.util.ts` | Single-purpose helper |
| `src/common/interceptors/response.interceptor.ts` | Clear pipeline |
| `src/modules/auth/utils/rbac.util.ts` | Pure functions |

---

## Suggested work order

1. `execution-orchestrator.service.ts` — biggest readability win in executions
2. `executions.service.ts` — fix misleading param and retry comments
3. `workflow-builder.service.ts` — collapse mutation boilerplate
4. `workflow-definition.validator.ts` — flatten `validate()` and ternaries
5. `json-output.parser.ts` — dedupe normalize patterns (do in small commits)
6. `reference-url.sanitizer.ts` + tool adapters + `ollama-chat.provider.ts`
7. Catalog services (agents → prompts → tools → workflows) — same pattern each
8. `auth.service.ts` + `users.service.ts`
9. `json-size.util.ts` + `global-exception.filter.ts` + `permissions.guard.ts`
10. Minor controller/DTO moves (Priority 5)

---

## Per-file checklist

Copy this when working through the plan:

```
[ ] Read "Hard to read because" for this file
[ ] Applied only listed refactor actions (no scope creep)
[ ] No behavior change
[ ] No new files/folders/patterns
[ ] WHAT comments removed; WHY comments kept
[ ] pnpm lint
[ ] pnpm test
[ ] (if module/providers) pnpm build
```

---

## Files intentionally excluded

| Area | Reason |
|------|--------|
| `specs/*` | Contract/docs artifacts; separate task |
| `src/infrastructure/database/seeds/*.seed.ts` | Data-heavy by design |
| `*.spec.ts` | Update only when production code changes require it |
| Structural items in `CLEANUP_PLAN.md` | Dead code, merges, DI wiring — not readability |

---

*Last updated: after initial pass on `llm-agent-runner.service.ts` and `tool-invoker.service.ts`.*
