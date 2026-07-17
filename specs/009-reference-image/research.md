# Research: Reference Image Workflow

**Date**: 2026-07-15

## Decision 1: Required inputs

**Choice**: Reuse `definition.policies.requiredInputs = ['season','category','market']` (platform convention from 008). Trend Research keys (`researchReport`, `references`, `trendFindings`) are **optional** enrichment — Workflow runs standalone.

## Decision 2: Agent / Prompt codes

| Step | Agent code | Prompt code | capability |
|------|------------|-------------|------------|
| Search images | `fashion-image-search` | `fashion-image-search-prompt` | `research` |
| Group references | `fashion-reference-grouper` | `fashion-reference-grouper-prompt` | `analysis` |
| Organize inspiration | `fashion-inspiration-organizer` | `fashion-inspiration-organizer-prompt` | `analysis` |

Tools: `fashion-image-search` → `web-search` + `web-browser`. Keep Trend Research catalog untouched.

## Decision 3: Stub fixtures

`StubAgentRunnerService` returns structured payloads keyed by `agentCode` for the three Reference Image Agents; Trend Research fixtures remain; default echo stub for others.

## Decision 4: Graph

Linear: search → group → organize. Metadata pointers only (title, url, optional thumbnailUrl/notes) — no binary assets.

## Decision 5: Handoff keys

| Key | Producer | Consumer |
|-----|----------|----------|
| `imageCandidates` | search | group / Style Analysis |
| `groupedReferences` | grouper | organize / Style Analysis |
| `inspirationBoard` | organizer | Style Analysis (primary) |
