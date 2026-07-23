# Research: Platform Domain Audit Logs

## Decision 1: Best-effort writes

**Choice**: `try/catch` around insert; log error; never throw to caller.  
**Rationale**: Spec clarification 2026-07-20.  
**Rejected**: Shared DB transaction with business mutation.

## Decision 2: Permission seed

**Choice**: `PERMISSIONS.AUDIT.READ = 'audit:read'`; admin list + super_admin via `ALL_PERMISSIONS`.  
**Rationale**: Spec FR-010.

## Decision 3: LLM modeling

**Choice**: Domain `agent`, action `llm_config_changed` when `config.provider`/`config.model` change.  
**Rationale**: Spec clarification; catalog is read-only.

## Decision 4: Actor plumbing

**Choice**: Pass `actorUserId` from `@CurrentUser().sub` into mutate service methods that lack it today.  
**Rationale**: FR-005 requires actor when available.

## Decision 5: IP / user-agent

**Choice**: Optional on `record`; MVP may omit unless already trivial — actor + resource identity are required.  
**Rationale**: Spec marks IP/UA optional.
