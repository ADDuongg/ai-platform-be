# Quickstart: Domain Audit Logs

1. `pnpm migration:run && pnpm seed:rbac` (or full seed)
2. Login as admin → obtain access token
3. `POST /api/v1/agents` create draft → note id/code
4. `GET /api/v1/audit-logs?domain=agent` → expect `created` event with actor
5. Change Agent draft `config.provider`/`config.model` via `PATCH /api/v1/agents/:id` → expect `llm_config_changed` (and `updated`)
6. As viewer token → `GET /api/v1/audit-logs` → 403
