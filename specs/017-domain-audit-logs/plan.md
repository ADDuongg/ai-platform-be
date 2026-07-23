# Implementation Plan: Platform Domain Audit Logs

**Branch**: `017-domain-audit-logs` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-domain-audit-logs/spec.md`

## Summary

Add NestJS `AuditModule` with append-only `domain_audit_logs`, best-effort `AuditLogService.record`, list/get APIs gated by `audit:read` (admin + super_admin), and instrumentation of Agents / Workflows / Tools / Prompts / Executions mutators. Auth audit stays separate. LLM provider/model changes → domain `agent` + action `llm_config_changed`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20+  
**Primary Dependencies**: NestJS, TypeORM, class-validator, Jest  
**Storage**: PostgreSQL (`domain_audit_logs`)  
**Testing**: Jest unit tests (service + repository filters)  
**Target Platform**: NestJS API (`/api/v1`)  
**Project Type**: Backend web-service (monolith modules)  
**Performance Goals**: List filter+page under interactive use; writes fire-and-forget after business success  
**Constraints**: Best-effort write; no secrets in metadata; no public POST audit  
**Scale/Scope**: MVP domains + read API; no SIEM/retention

## Constitution Check

*GATE: Pass — domain module, repository pattern, permission guards, no Active Record, tests for writer/query.*

## Project Structure

### Documentation (this feature)

```text
specs/017-domain-audit-logs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/audit-logs-api.yaml
└── tasks.md
```

### Source Code

```text
src/modules/audit/
├── audit.module.ts
├── constants/audit.constants.ts
├── controllers/audit-logs.controller.ts
├── dto/
├── entities/domain-audit-log.entity.ts
├── repositories/domain-audit-logs.repository.ts
└── services/audit-log.service.ts (+ .spec.ts)

src/infrastructure/database/migrations/1710000008000-CreateDomainAuditLogsTable.ts
src/common/constants/permissions.ts  # AUDIT.READ
src/infrastructure/database/seeds/rbac.seed.ts
# Instrument: agents|workflows|tools|prompts|executions services (+ controllers for actorId)
```

## Complexity Tracking

| Decision | Why needed | Simpler alternative rejected |
|----------|------------|------------------------------|
| Explicit `record()` in services | Clear, testable, best-effort | Global interceptor — opaque, hard to filter metadata |
| Separate from `auth_audit_logs` | Different lifecycle & readers | Merge tables — risky Auth regression |

## Phase 0 / 1

See `research.md`, `data-model.md`, `contracts/`, `quickstart.md`.
