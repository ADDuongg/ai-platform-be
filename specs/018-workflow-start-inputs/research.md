# Research: Workflow Start Inputs (018)

**Date**: 2026-07-21

## Decision 1 — No new Nest APIs for Phase A.1

**Choice**: Document and consume existing Workflow Builder + Execution APIs.

**Rationale**: `PUT/GET /api/v1/workflows/:id/definition` already persist full `definition.policies`; Execution start already enforces `policies.requiredInputs` as string[]. Product explicitly scoped “no new Nest engine”.

**Alternatives rejected**: Dedicated start-inputs CRUD resources; server-side form schema service; GET-by-code mandatory endpoint (nice-to-have later, not required for MVP).

## Decision 2 — `requiredInputs` vs `inputSchema`

**Choice**: `requiredInputs: string[]` remains the only start-time requiredness source. `inputSchema` is optional UI metadata (A.2+), keyed by field name.

**Rationale**: Matches existing enforcement and Kids Fashion seeds; keeps BE validation generic; FE owns widgets.

**Alternatives rejected**: Deriving requiredness from JSON Schema `required`; BE validating widget enums in MVP.

## Decision 3 — Widget catalog ownership

**Choice**: FE constant `['text','textarea','select','date']`; unknown → text fallback. BE stores opaque jsonb.

**Rationale**: Small closed set; avoids DB migrations for UI vocabulary; allows FE iteration.

## Decision 4 — Modules resolve Workflow by code

**Choice**: Operator config holds `workflowCode`; FE resolves UUID via `GET /workflows` list (or cached id) then `GET .../definition` + `POST .../execute`.

**Rationale**: No `GET /workflows/by-code/:code` today; list+match is enough for seeded Kids Fashion codes.

## Decision 6 — UI split: Workflow detail vs Builder

**Choice**: Schema CRUD (keys + label/widget/options/placeholder) on **Workflow detail**; **Builder** only edits `inputSchema[key].default`.

**Rationale**: Detail page is the catalog home for “what does this workflow need to start”; Builder focuses on graph + run prefill while designing. Same `PUT definition` API; FE merges policies.

**Alternatives rejected**: All start-input editing only in Builder (clutters canvas); defaults also only on detail (slower iterate while building).

