# Tasks: Platform Domain Audit Logs

**Input**: Design documents from `/specs/017-domain-audit-logs/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

## Phase 1: Foundational

- [x] T001 Add `PERMISSIONS.AUDIT.READ` + admin seed mapping
- [x] T002 Migration `domain_audit_logs` + indexes
- [x] T003 Audit entity, enums/constants, repository, `AuditLogService.record` (best-effort)
- [x] T004 List/get DTOs, controller, `AuditModule`, wire `AppModule`
- [x] T005 Unit tests for `AuditLogService` / list filters

## Phase 2: Instrument domains (US1–US2)

- [x] T006 Agents: import AuditModule; record on create/update/publish/createVersion/enable/disable/softDelete + llm_config_changed; plumb actorId
- [x] T007 Workflows: same mutate hooks + actorId
- [x] T008 Tools: same mutate hooks + actorId
- [x] T009 Prompts: same mutate hooks + actorId
- [x] T010 Executions: start/cancel/retry hooks

## Phase 3: Polish

- [x] T011 Update BACKLOG status → Implementing/Done notes; quickstart aligns

## Dependency

T001–T004 before instrumentation. Domains T006–T010 parallel after T004.
