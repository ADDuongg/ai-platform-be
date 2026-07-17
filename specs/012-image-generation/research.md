# Research: Image Generation Workflow

**Date**: 2026-07-15

## Decision 1: Required inputs

**Choice**: `definition.policies.requiredInputs = ['season','category','market','designBrief','designSpecification']`.

Unlike earlier Milestone 2 workflows, Design Brief handoff keys are **required** at start (not optional enrichment). Presence check only (objects non-null); deep schema validation deferred.

**Alternatives rejected**: Require only season/category/market and synthesize brief/spec (violates clarify/spec).

## Decision 2: Agent / Prompt codes

| Step | Agent code | Prompt code | capability | toolRefs |
|------|------------|-------------|------------|----------|
| Prep prompts | `fashion-image-prompt-prep` | `fashion-image-prompt-prep-prompt` | `generation` | `[]` |
| Generate variations | `fashion-image-generator` | `fashion-image-generator-prompt` | `generation` | `['image-generation']` |
| Organize outputs | `fashion-image-organizer` | `fashion-image-organizer-prompt` | `analysis` | `['object-storage']` |

**Rationale**: Clarified Tool requirements; prep is pure synthesis; generate uses catalog image tool; organize packages for Design Review and wires storage stub.

## Decision 3: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the three Image Generation Agents with **exactly 2** prompts / raw drafts / final variations. Prior Fashion fixtures remain; default echo stub for others.

## Decision 4: Graph

**Linear** (spec): prep → generate → organize. No parallel branches.

**Mappings** (clarify):
- Generate node **MUST** map `imageGenPrompts` from Shared Context.
- Organize node **MUST** map `rawGenerations` from Shared Context.

## Decision 5: Context shapes (clarify)

| Key | Producer | Shape |
|-----|----------|--------|
| `imageGenPrompts` | prep **only** | `{ summary, prompts[{ id, label, text }] }` — default fixture: **2** prompts |
| `rawGenerations` | generate **only** | array of `{ id, label, promptRef?, assetUrl?, notes? }` — default: **2** drafts |
| `generatedImages` | organize **only** | `{ summary, variations[{ id, label, promptRef?, assetUrl?, notes? }] }` — default: **2** variations |

`promptRef` optional; when present SHOULD match a prep prompt `id`.

## Decision 6: Handoff consumers

| Key | Primary consumer |
|-----|------------------|
| `generatedImages` | Design Review Workflow (required) |
| `imageGenPrompts` / `rawGenerations` | Intermediate only (not Design Review contract) |
