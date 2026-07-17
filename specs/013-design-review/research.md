# Research: Design Review Workflow

**Date**: 2026-07-15

## Decision 1: Required inputs

**Choice**: `definition.policies.requiredInputs = ['season','category','market','generatedImages']`.

Image Generation handoff key is **required** at start. Presence check only (object non-null / non-blank); **no** minimum `variations.length` gate (clarify Q1). Deep schema validation deferred.

Optional enrichment: `designBrief`, `designSpecification`, `ageBand`, `constraints`.

**Alternatives rejected**: Require ≥2 variations at start (Fashion-specific validation beyond generic `requiredInputs`).

## Decision 2: Agent / Prompt codes

| Step | Agent code | Prompt code | capability | toolRefs |
|------|------------|-------------|------------|----------|
| Review quality | `fashion-quality-reviewer` | `fashion-quality-reviewer-prompt` | `analysis` | `[]` |
| Improvement suggestions | `fashion-improvement-suggester` | `fashion-improvement-suggester-prompt` | `analysis` | `[]` |
| Final score | `fashion-design-scorer` | `fashion-design-scorer-prompt` | `analysis` | `['object-storage']` |

**Rationale**: Clarified Tool requirement on scorer; quality/suggestions are pure analysis; score packages terminal Milestone 2 artifact and wires storage stub.

## Decision 3: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the three Design Review Agents. Default fixtures assume **exactly 2** input variations and emit:

- non-empty `qualityReview.findings` (≥1)
- non-empty `improvementSuggestions.suggestions` (≥1)
- `designReviewScore.overallScore` (0–100 number)
- `designReviewScore.perVariation` with **exactly 2** entries (clarify Q2)

Prior Fashion fixtures remain; default echo stub for others.

## Decision 4: Graph

**Linear** (spec): quality → suggestions → score. No parallel branches.

**Mappings** (clarify):

- Quality node **MUST** map `generatedImages`.
- Suggestions node **MUST** map `qualityReview`.
- Score node **MUST** map both `qualityReview` and `improvementSuggestions`.

## Decision 5: Context shapes (clarify)

| Key | Producer | Shape |
|-----|----------|--------|
| `qualityReview` | quality **only** | `{ summary, findings[{ id, label, severity?, variationRef?, notes? }] }` — `severity` optional free-text (no enum) |
| `improvementSuggestions` | suggestions **only** | `{ summary, suggestions[{ id, label, priority?, variationRef?, notes? }] }` |
| `designReviewScore` | score **only** | `{ summary, overallScore (0–100), perVariation?[{ variationRef, score, notes? }], criteria?[], notes?[] }` — fixtures MUST include `perVariation`×2 |

## Decision 6: Terminal output

| Key | Primary consumer |
|-----|------------------|
| `designReviewScore` | Milestone 2 terminal artifact (closes Kids Fashion chain) |
| `qualityReview` / `improvementSuggestions` | Intermediate only |
