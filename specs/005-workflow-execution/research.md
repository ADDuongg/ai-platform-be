# Research: Workflow Execution

**Date**: 2026-07-14

## R1 — Async orchestration vs sync HTTP

**Decision**: Enqueue BullMQ job on start; HTTP returns Execution immediately (`pending`/`running`).

**Rationale**: Aligns with SYSTEM_DESIGN + existing `QueueModule`; avoids long HTTP timeouts.

**Alternatives**: Sync run in request (rejected — blocks, poor cancel UX).

## R2 — Parallel ready-set

**Decision**: Compute ready-set correctly; MVP serializes step invocations inside one worker job.

**Rationale**: Correctness first; stub agents are instant; true parallel workers can come later without API change.

## R3 — Agent runner

**Decision**: `AgentRunner` interface + `StubAgentRunner` (deterministic echo). Optional fail via `config.failAttempts` for tests.

**Rationale**: Spec allows stub; proves engine without Prompt/LLM deps.

## R4 — Circular module deps

**Decision**: `POST /workflows/:id/execute` implemented in `WorkflowExecuteController` inside `ExecutionsModule` (imports WorkflowsModule), not inside WorkflowsModule.

## R5 — Mapping

**Decision**: Flat string paths with optional dot notation (`a.b`); empty inputMapping → full context copy; empty outputMapping → shallow-merge output into context.

## R6 — Snapshot shape

**Decision**: Store `{ definition, agentPins: [{ nodeId, agentCode, agentVersion }] }` in `definition_snapshot` jsonb.
