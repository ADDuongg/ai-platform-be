# Research: Execution Deliverables / Artifacts

**Feature**: `021-execution-artifacts` | **Date**: 2026-07-22

## Decision 1 — When to materialize

- **Decision**: Run materialization only when Execution reaches `COMPLETED` (orchestrator `markExecutionTerminal(..., COMPLETED)` and empty-graph complete path). Skip for `FAILED` / `CANCELLED`.
- **Rationale**: Spec assumption; deliverables are successful-run products.
- **Alternatives**: Materialize on every terminal state (rejected — incomplete context); async queue job (deferred — MVP sync in orchestrator with best-effort try/catch).

## Decision 2 — Failure mode

- **Decision**: Best-effort. Execution stays `COMPLETED`. Each Artifact row gets `status: ready | failed` and optional `error_message` / `error_json`. Log warnings. Never throw out of materializer into terminal mark in a way that reverts status.
- **Rationale**: Spec US4 / FR-009 / SC-005; backlog preference.
- **Alternatives**: Fail Execution (rejected); silent skip (rejected — not observable).

## Decision 3 — Storage root & S3 seam

- **Decision**: New env `ARTIFACT_STORAGE_ROOT` default `.data/execution-artifacts`. Path `{root}/executions/{executionId}/{artifactId}/...`. Introduce `ArtifactBlobStore` interface (`put`, `get`/`createReadStream`) with `LocalArtifactBlobStore`. Comment `// TODO(aws-s3): implement S3ArtifactBlobStore when ARTIFACT_STORAGE=s3`.
- **Rationale**: Aligns with backlog; avoids coupling deliverables to tool-adapter invoke API.
- **Alternatives**: Reuse `TOOL_STORAGE_ROOT` only (acceptable fallback if env omitted — document); call `ObjectStorageAdapter.invoke` (rejected for public download path clarity).

## Decision 4 — Image / image_set value shape

- **Decision**: Resolve URLs from context value:
  - `image`: string URL, or object with `assetUrl` / `url`
  - `image_set`: array of such items (Kids Fashion `rawGenerations[].assetUrl`)
  - Download each http(s) URL; store one blob per item; for `image_set` store a **manifest in `content_json`** (`{ items: [{ storageKey, contentType, byteSize, sourceUrl? }] }`) and leave top-level `storage_key` null or set to first item; for single `image`/`file` use top-level `storage_key`.
- **Rationale**: Matches seeded agent output schema; vendor URL must not remain sole source of truth.
- **Alternatives**: One zip per set (overkill MVP).

## Decision 5 — API surface

- **Decision**:
  - `GET /api/v1/executions/:executionId/artifacts` → list
  - `GET /api/v1/executions/:executionId/artifacts/:artifactId/content` → stream/download when blob-backed (inline kinds may return JSON/text body)
  - Permission: `executions:read` (same as get execution)
- **Rationale**: FR-006/012; nested ownership.
- **Alternatives**: Embed artifacts in Execution GET (payload bloat); signed URLs only (phase later).

## Decision 6 — Declaration validation

- **Decision**: MVP — read `policies.outputs` as best-effort array at materialize time; invalid entries → failed Artifact or skip with log. Optional light validation when saving Workflow definition can follow (not blocking MVP if seed is correct).
- **Rationale**: Avoid blocking Builder publishes; seed will be correct.
- **Alternatives**: Strict publish-time schema validation (nice follow-up).

## Decision 7 — Idempotency

- **Decision**: Before insert, if Artifacts already exist for execution, skip re-materialize (or upsert by key). Prevents double work if orchestrator retries complete path.
- **Rationale**: Safe re-entry.
- **Alternatives**: Always append (rejected — unique key constraint).
