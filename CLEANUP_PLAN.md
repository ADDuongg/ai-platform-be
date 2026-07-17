# Project Cleanup & Simplification Plan (Behavior-Preserving)

This plan is **not** a feature implementation. The goal is to **reduce unnecessary complexity while preserving exact behavior**.

Docs used as constraints:
- `docs/engineering/ARCHITECTURE.md`
- `docs/engineering/SYSTEM_DESIGN.md`
- `docs/engineering/WORKFLOW_ENGINE.md`
- `README.md`

> Note: `ENGINEERING_GUIDE.md` was requested but is not present in this repo.

## Principles (operationalized)

- **Delete dead code first.**
- Prefer **flat, explicit** code over indirection.
- Prefer **merging tiny single-use files** over creating new “shared layers”.
- Do **not** introduce new patterns or architectural layers.
- Keep “real boundaries” (API vs worker vs persistence) intact.
- Every step must be:
  - small
  - reversible
  - testable
  - behavior-preserving

## Guardrails / Non-goals

We will **not**:
- merge `ExecutionsService` with the orchestrator/processor (real separation: API/persistence vs worker loop)
- merge `WorkflowsService` with builder/editor services (real separation: CRUD vs graph editing)
- create a new generalized “CatalogLifecycleService” or a generic “VersionRepository” framework (adds abstraction)
- split `src/modules/executions/services/json-output.parser.ts` (1172 lines) in this pass (increases file count; do later only with strong motivation)
- modify `specs/*` contract artifacts in this cleanup (docs/FE handoff; separate task if desired)
- rewrite seed data dumps unless there is dead code evidence (they’re large but intentional)

## How to run / verify after each step

After every small step (or small batch inside the same phase), run:

```bash
pnpm lint
pnpm test
```

Optional (but recommended when refactoring providers/modules):

```bash
pnpm build
```

And ensure dev server still boots:

```bash
pnpm start:dev
```

---

## Phase 1 — Dead scaffolding removal (high value, low risk)

### 1. Remove empty `SharedModule`

**Why simplify**
- `src/shared/shared.module.ts` is `@Global()` with **no providers/exports**. It adds conceptual weight and file count.

**Files affected**
- `src/shared/shared.module.ts` (delete)
- `src/app.module.ts` (remove `SharedModule` import and from `imports`)

**Why behavior stays unchanged**
- No providers are exported; removing it cannot change DI bindings.

---

### 2. Remove unused `QueueService` (keep queue infrastructure)

**Why simplify**
- `QueueService` is a wrapper convenience with no evidence of injection/usage in runtime code.
- Feature modules already use Bull patterns (`@InjectQueue`) directly.

**Files affected**
- `src/infrastructure/queue/queue.service.ts` (delete)
- `src/infrastructure/queue/queue.module.ts` (remove from `providers` and `exports`)
- `src/infrastructure/queue/index.ts` (adjust exports)
- Any imports referencing `QueueService` (should be none; confirm with search)

**Why behavior stays unchanged**
- Queue registration (`BullModule`) stays.
- Only an unused helper service is removed.

---

### 3. Remove unused `DatabaseService` (keep TypeORM module)

**Why simplify**
- `DatabaseService` is not used by health checks (health uses Terminus `TypeOrmHealthIndicator`).
- Adds an extra abstraction without usage evidence.

**Files affected**
- `src/infrastructure/database/database.service.ts` (delete)
- `src/infrastructure/database/database.module.ts` (remove from `providers` and `exports`)
- `src/infrastructure/database/index.ts` (adjust exports)

**Why behavior stays unchanged**
- `TypeOrmModule` export remains, so all repositories/entities continue working.
- No consumers exist; no runtime behavior depends on it.

---

### 4. Remove unused utils (keep used crypto/time helpers)

**Why simplify**
- `src/common/utils/index.ts` exports several utils; some are unused in production runtime and add noise.

**Keep**
- `password.util.ts` (used by users/auth/seeds)
- `duration.util.ts` (used by auth)

**Remove if confirmed unused**
- `date.util.ts`
- `response.util.ts` (response envelope is already handled by interceptor)
- `pagination.util.ts` (services hand-roll list meta; util appears only in tests)
- `uuid.util.ts` (confirm not used outside util specs)

**Files affected**
- delete the unused util files + their `.spec.ts` if they become orphaned
- update `src/common/utils/index.ts` to export only the remaining ones

**Why behavior stays unchanged**
- No runtime imports → deleting them does not change outputs.
- Existing response behavior is via interceptor.

---

### 5. Remove dead placeholder folders / exports

**Why simplify**
- Placeholder `index.ts` that only `export {}` or empty barrels create navigation overhead.

**Candidates (delete if unused)**
- `src/common/types/` (no imports found)
- `src/common/{validators,transformers,serializers,middleware,pipes}/` if placeholders only
- `src/modules/auth/{interfaces,enums}/` if placeholders only

**Why behavior stays unchanged**
- No runtime imports.

---

### 6. Remove unused cache constants

**Why simplify**
- `src/common/constants/cache-keys.ts` defines keys/TTLs but isn’t referenced.

**Files affected**
- `src/common/constants/cache-keys.ts` (delete)
- `src/common/constants/index.ts` (remove export)

**Why behavior stays unchanged**
- No runtime usage.

---

### 7. Remove dead `@Roles` stack and `RolesGuard` global registration

**Why simplify**
- `RolesGuard` is registered globally in `app.module.ts`, but there is **no evidence of any `@Roles()` usage on routes**.
- The project uses `@Permissions()` for authorization.

**Files affected**
- `src/common/guards/roles.guard.ts` (delete)
- `src/common/decorators/roles.decorator.ts` (delete)
- `src/common/decorators/index.ts` (remove export)
- `src/common/constants/index.ts` (remove role-related metadata key/constants if unused)
- `src/app.module.ts` (remove `RolesGuard` from `APP_GUARD`, remove import)

**Why behavior stays unchanged**
- If no route uses `@Roles()`, the guard never blocks/permits anything based on roles.
- Authorization remains enforced by `PermissionsGuard`.

---

### 8. Remove `EventEmitterModule` if unused

**Why simplify**
- Bootstrapped in `app.module.ts` but no `@OnEvent` or `EventEmitter2` usage detected.

**Files affected**
- `src/app.module.ts` (remove `EventEmitterModule.forRoot(...)` + import)

**Why behavior stays unchanged**
- With no listeners or emitter usage, removing it changes nothing.

---

## Phase 2 — Reduce folder/file noise (low risk)

### 9. Remove unused barrel `index.ts` files (selectively)

**Why simplify**
- Many `index.ts` are 1–2 lines of re-exports and are never imported.

**Rule**
- Only delete a barrel if `rg`/search confirms **no imports** reference it.
- Keep barrels that are part of stable alias imports (e.g. `@modules/*/enums`, `@modules/*/types`, `@common/utils`).

**Why behavior stays unchanged**
- No import points to them → removing them cannot affect runtime.

---

### 10. Merge executions constants files

**Why simplify**
- Constants are split into multiple tiny files which increases navigation and import churn.

**Files affected**
- Merge:
  - `src/modules/executions/constants/execution.constants.ts`
  - `src/modules/executions/constants/agent-runner.constants.ts`
  - `src/modules/executions/constants/tool-runtime.constants.ts`
- into a single file (example name): `src/modules/executions/constants/executions.constants.ts`
- Update imports throughout executions module accordingly.

**Why behavior stays unchanged**
- Same exported values (symbols/strings) with updated import paths.

---

## Phase 3 — Executions module simplification (low–medium risk)

### 11. Extract stub fixtures from `StubAgentRunnerService`

**Why simplify**
- `src/modules/executions/services/stub-agent-runner.service.ts` is very large mostly due to embedded fixture data.
- Keep behavior identical by moving only the data, not the logic.

**Files affected**
- Create `src/modules/executions/services/stub-agent.fixtures.ts` (or `.json` if preferred)
- Update `stub-agent-runner.service.ts` to import fixture data.

**Why behavior stays unchanged**
- Same mapping keys → same returned outputs.

---

### 12. Remove dead method `ToolAdapterRegistry.codes()`

**Why simplify**
- Unused method adds API surface and confusion.

**Files affected**
- `src/modules/executions/tools/tool-registry.ts` (remove method)

**Why behavior stays unchanged**
- No callers.

---

### 13. Trim duplicated “FUTURE” comment blocks in tool adapters

**Why simplify**
- Repeated template comments add noise and make adapters longer without adding runtime value.

**Files affected**
- `src/modules/executions/tools/adapters/*.adapter.ts` (edit comments only)

**Why behavior stays unchanged**
- No logic changes.

---

### 14. (Optional) Merge tiny single-use helper into its consumer

**Why simplify**
- Files under ~50 lines used once add indirection.

**Candidates**
- `prompt-template.renderer.ts` → inline into `llm-agent-runner.service.ts` if truly single-consumer.

**Do NOT remove**
- `agent-runner.types.ts` if shared by stub + llm runner (shared contract is valuable).

**Why behavior stays unchanged**
- Inline move of identical code.

---

### 15. Simplify stub-mode DI in `ExecutionsModule` (carefully)

**Why simplify**
- Stub mode still wires up providers for openai/gemini which are “not implemented” and unused.

**Files affected**
- `src/modules/executions/executions.module.ts`

**Constraint**
- Keep `AGENT_RUNNER` selection behavior identical:
  - `stub` → `StubAgentRunnerService`
  - others → `LlmAgentRunnerService`

**Why behavior stays unchanged**
- DI wiring simplification only; runner selection remains the same.

---

## Phase 4 — Remove duplication via tiny shared helpers (medium risk)

This phase **does not introduce new service layers**. Only small pure functions/constants.

### 16. Extract shared JSON payload size assertion

**Why simplify**
- Same `Buffer.byteLength(JSON.stringify(value))` logic appears in:
  - agents service (`assertSchemaPayloadSize`)
  - prompts service (`assertPayloadSize`)
  - tools service (`assertPayloadSize`)
  - workflows definition validator (`assertPayloadSize`)

**Files affected**
- Add one helper in a minimal place (e.g. `src/common/utils/json-size.util.ts`), export from `@common/utils`
- Replace inlined duplicates with helper calls.

**Why behavior stays unchanged**
- Same computed size, same threshold, same thrown exception type/message (keep messages identical).

---

### 17. Extract shared `canSeeDrafts` permission check

**Why simplify**
- Same permission check logic duplicated across:
  - `agents.service.ts`
  - `prompts.service.ts`
  - `tools.service.ts`
  - `workflows.service.ts`

**Files affected**
- Add helper in `@common/utils` (or `@common/guards` if it’s auth-related), then call it.
- Keep the public method `canSeeDrafts()` in each service if tests/other services call it (e.g. builder uses it).

**Why behavior stays unchanged**
- Same input permissions array → same boolean.

---

## Deferred / Separate cleanup candidates (do later)

- `specs/*/contracts/*`: docs-only artifacts; consolidate in a docs task if desired.
- `json-output.parser.ts`: only split after proving it improves clarity without breaking tests.
- Seeds (`*.seed.ts`): big but intentionally data-heavy; only refactor if there is a concrete pain point.
- Catalog CRUD deeper de-duplication: prefer tiny helpers over a new framework.

---

## Suggested implementation order (step-by-step)

1. Phase 1.1–1.3 (remove `SharedModule`, unused infra services)
2. Phase 1.4–1.8 (remove dead utils/placeholders/roles/eventemitter)
3. Phase 2 (barrels + constants merge)
4. Phase 3 (executions: fixtures, dead method, comment trims, optional helper merges)
5. Phase 4 (tiny shared helpers for payload size + draft visibility)

Each step: run `pnpm lint && pnpm test` (and `pnpm build` for module/provider changes).

