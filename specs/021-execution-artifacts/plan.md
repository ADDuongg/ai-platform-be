# Implementation Plan: Execution Deliverables / Artifacts

**Branch**: `021-execution-artifacts` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/021-execution-artifacts/spec.md`

## Summary

On successful Execution completion, read `definition.policies.outputs[]` and materialize each declared key from final `contextJson` into `execution_artifacts` rows. Inline kinds store `content_json`; blob/image/image_set download http(s) URLs into a local **ArtifactBlobStore** (seam for future S3) and store `storage_key`. Expose `GET /api/v1/executions/:id/artifacts` (+ content download) under `executions:read`. Seed Kids Fashion with `outputs` for `rawGenerations`. FE contract pack required.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20+ (NestJS 10)  
**Primary Dependencies**: NestJS, TypeORM, PostgreSQL, existing Executions module + Workflow `policies` jsonb, local filesystem blob store (extend pattern from `ObjectStorageAdapter`)  
**Storage**: PostgreSQL table `execution_artifacts`; local files under `ARTIFACT_STORAGE_ROOT` (default `.data/execution-artifacts`)  
**Testing**: Jest unit tests for materializer (inline + blob with mocked HTTP/fs) + repository; controller permission smoke if pattern exists  
**Target Platform**: NestJS API (`/api/v1`)  
**Project Type**: Backend web-service feature (+ FE contracts)  
**Performance Goals**: Materialize after complete (async-safe in orchestrator path); image downloads best-effort; list artifacts O(n) per execution  
**Constraints**: Best-effort materialization must not flip COMPLETED → FAILED; no S3 in MVP; reuse `executions:read`; no graph/mapper changes  
**Scale/Scope**: MVP kinds text|json|image|image_set|file|url; one Artifact per `(execution_id, key)`

## Constitution Check

*GATE: Pass — Repository pattern; no Active Record; extends Executions module; contracts include OpenAPI + types + interfaces + index; local storage with explicit S3 seam comment.*

Post-design: unchanged — no parallel CRUD architectures; FE-callable APIs fully contracted.

## Project Structure

### Documentation (this feature)

```text
specs/021-execution-artifacts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── execution-artifacts-api.yaml
│   ├── types.ts
│   ├── interfaces.ts
│   └── index.ts
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
src/infrastructure/database/migrations/
  NNNN-CreateExecutionArtifactsTable.ts
src/modules/executions/
  entities/execution-artifact.entity.ts
  repositories/execution-artifacts.repository.ts
  services/artifact-materializer.service.ts
  services/artifact-blob-store.ts          # interface + local impl (+ S3 TODO)
  controllers/execution-artifacts.controller.ts  # or nest under executions.controller
  dto/execution-artifact-response.dto.ts
  # wire materializer from ExecutionOrchestratorService on COMPLETED
src/infrastructure/database/seeds/workflows.seed.ts  # policies.outputs for kids-fashion
src/common/config/  # ARTIFACT_STORAGE_ROOT env (optional; may reuse TOOL_STORAGE_ROOT)
```

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|----------|------------|------------------------------|
| Separate ArtifactBlobStore | Clear S3 swap seam; not overload tool `object-storage` adapter | Only reuse ToolAdapter invoke (wrong abstraction for platform deliverables) |
| Best-effort + `status` on Artifact | Meets SC-005 without failing runs | Fail whole Execution on download error |
| Nested under executions API | Natural ownership; same permission | Top-level `/artifacts` resource |

## Phase 0 / 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
