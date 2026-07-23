# Quickstart: Agent / Prompt Draft Editors

Validate existing APIs + 020 contracts. FE forms live in `ai-platform-fe`.

## Prerequisites

- API up; migrated + seeded (`pnpm migration:run && pnpm seed`)
- JWT with `agents:read`, `agents:update`, `agents:publish` and/or `prompts:read`, `prompts:update`, `prompts:publish`
- Pick a published Agent and Prompt from seed (or create via existing APIs)

## 1) Prompt — new draft → edit template → publish

```http
POST /api/v1/prompts/{promptId}/versions
Authorization: Bearer {token}
Content-Type: application/json

{ "changelog": "draft editor smoke" }
```

Expect `201` + version `status: draft`. Note `version` and parent `draftVersion` on `GET /prompts/{id}`.

```http
PATCH /api/v1/prompts/{promptId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "template": "Smoke template edited at {{season}}."
}
```

Expect `200`. Then:

```http
GET /api/v1/prompts/{promptId}/versions/{draftVersion}
Authorization: Bearer {token}
```

Expect `template` matches. Publish:

```http
POST /api/v1/prompts/{promptId}/publish
Authorization: Bearer {token}
```

Expect `200`; further PATCH without new draft → **409**.

## 2) Agent — new draft → PATCH flat schemas → publish

```http
POST /api/v1/agents/{agentId}/versions
Authorization: Bearer {token}
```

```http
PATCH /api/v1/agents/{agentId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "inputSchema": {
    "type": "object",
    "required": ["season"],
    "properties": {
      "season": { "type": "string" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["final_result"],
    "properties": {
      "final_result": { "type": "string" }
    }
  }
}
```

Expect `200`. `GET .../versions/{draftVersion}` shows schemas. Publish with `agents:publish`.

**Form helpers** (FE): `fieldsToObjectSchema` / `objectSchemaToFields` in `contracts/types.ts`.

## 3) Permission / no-draft checks

| Call | Without permission | Expect |
|------|-------------------|--------|
| PATCH draft | missing `*:update` | 403 |
| POST publish | missing `*:publish` | 403 |
| PATCH schemas with no draft | has update | 409 (`AGENT_NO_DRAFT_TO_PUBLISH` / `PROMPT_VERSION_IMMUTABLE`) |

## 4) BE unit smoke (this repo)

```bash
pnpm exec jest src/modules/agents/services/agents.service.spec.ts src/modules/prompts/services/prompts.service.spec.ts
```

Confirm update/publish/permission cases still pass. Add regressions only if a gap is found vs this quickstart.

## Out of scope for MVP smoke

- Prompt variables form (fast follow)
- Builder auto-update of `outputMapping` after field rename
