# Data Model: Domain Audit Logs

## Entity: DomainAuditLog

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| domain | varchar | `agent` \| `workflow` \| `tool` \| `prompt` \| `execution` |
| action | varchar | see actions |
| resource_type | varchar | e.g. `agent`, `agent_version`, `execution` |
| resource_id | uuid | |
| resource_code | varchar nullable | |
| actor_user_id | uuid nullable | |
| ip | varchar(45) nullable | |
| user_agent | varchar(512) nullable | |
| metadata | jsonb nullable | non-secret summary |
| created_at | timestamptz | |

## Domains

`agent` | `workflow` | `tool` | `prompt` | `execution`

## Actions

`created` | `updated` | `published` | `enabled` | `disabled` | `archived` | `deleted` | `execution_started` | `execution_cancelled` | `execution_retried` | `llm_config_changed`

## Indexes

- `(domain, created_at DESC)`
- `(resource_type, resource_id)`
- `(actor_user_id, created_at DESC)`
- `(action, created_at DESC)`

## Relationships

No FK enforced to domain tables (append-only; resources may soft-delete). No merge with `auth_audit_logs`.
