# Quickstart: Workflow Builder

**Feature**: `004-workflow-builder`

Prerequisites: `pnpm migration:run && pnpm seed`, Auth + Agents + Workflows available.

## 1. Login as designer

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"designer@example.com","password":"..."}' | jq -r .accessToken)
```

## 2. Create draft workflow (Management)

```bash
WF=$(curl -s -X POST http://localhost:3000/api/v1/workflows \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"builder-demo","name":"Builder Demo"}')
WF_ID=$(echo "$WF" | jq -r .id)
```

## 3. Add nodes

```bash
curl -s -X POST "http://localhost:3000/api/v1/workflows/$WF_ID/nodes" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"agentCode":"research-agent","label":"Research"}'

curl -s -X POST "http://localhost:3000/api/v1/workflows/$WF_ID/nodes" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"agentCode":"review-agent","label":"Review"}'
```

## 4. Connect nodes

```bash
# Use node ids from previous responses
curl -s -X POST "http://localhost:3000/api/v1/workflows/$WF_ID/edges" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"from":"<research-node-id>","to":"<review-node-id>"}'
```

## 5. Get / validate definition

```bash
curl -s "http://localhost:3000/api/v1/workflows/$WF_ID/definition" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST "http://localhost:3000/api/v1/workflows/$WF_ID/definition/validate" \
  -H "Authorization: Bearer $TOKEN"
```

## 6. Negative cases

- Add disabled/unpublished agent → 400 `WORKFLOW_INVALID_AGENT_REF`
- Create cycle → 400 `WORKFLOW_INVALID_GRAPH`
- Mutate without draft (published-only workflow) → 409 `WORKFLOW_NO_DRAFT_TO_PUBLISH`
- Operator token mutate → 403
