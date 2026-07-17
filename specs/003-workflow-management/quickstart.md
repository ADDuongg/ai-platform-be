# Quickstart Validation: Workflow Management

**Feature**: `003-workflow-management` | **Date**: 2026-07-14

Prerequisites: `pnpm migration:run && pnpm seed`

## Scenario A — Seed catalog

1. Login as viewer → `GET /api/v1/workflows` → includes `sample-empty-workflow` (published).
2. Login as designer → same list may include drafts if any.

## Scenario B — Create → Publish

1. Designer `POST /api/v1/workflows` with unique code → draft.
2. `POST /api/v1/workflows/:id/publish` → status published, currentVersion=1.
3. Viewer can get by id; definition immutable on published version.

## Scenario C — Version + Clone

1. Designer `POST /api/v1/workflows/:id/versions` → draft v2.
2. Update definition on draft → publish.
3. `POST /api/v1/workflows/:id/clone` with new code → new draft workflow.

## Scenario D — Archive + visibility

1. Designer `DELETE /api/v1/workflows/:id` → archived, hidden from default list.
2. Viewer cannot create/publish/clone (403).
3. Viewer get draft id → 404.
