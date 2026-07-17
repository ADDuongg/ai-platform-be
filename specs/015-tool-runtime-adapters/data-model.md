# Data Model: Tool Runtime Adapters

**Feature**: `015-tool-runtime-adapters` | **Date**: 2026-07-16

No new database tables or migrations. Runtime uses existing Tool catalog + env + filesystem.

## Existing entities (reuse)

### Tool

| Field | Role |
|-------|------|
| `code` | Adapter registry key (`web-search`, `web-browser`, `image-generation`, `object-storage`) |
| `status` / `enabled` / `deletedAt` | Must be published + enabled + not soft-deleted to invoke |
| `toolType` | Informational / fallback registry key |
| `currentVersion` | Pin for resolve |

### Tool Version

| Field | Role |
|-------|------|
| `config_json` | Provider shape for MVP free/local (see below) |
| `input_schema` / `output_schema` | Document expected tool IO; lightweight validate when non-trivial |
| `secret_ref` | Env key name for future paid secrets (unused by MVP free paths) |
| `timeout_ms` / `max_retries` | Per-invoke limits |

### Agent Version

| Field | Role |
|-------|------|
| `toolRefs: string[]` | Ordered list of Tool codes to enrich before LLM call |

## Seeded `config_json` shapes (MVP)

```json
// web-search
{ "provider": "duckduckgo", "maxResults": 5 }

// web-browser
{ "provider": "native-fetch", "maxBytes": 262144 }

// image-generation
{ "provider": "stub-live" }

// object-storage
{ "provider": "filesystem", "rootEnv": "TOOL_STORAGE_ROOT" }
```

Future paid (documentation / comments only — not active seed providers):

```json
{ "provider": "google-cse" }      // web-search
{ "provider": "browserless" }    // web-browser
{ "provider": "flux" }           // image-generation
{ "provider": "aws-s3" }         // object-storage
```

## Runtime (non-persistent) structures

### ToolInvokeContext

- `executionId`, `agentCode`, `agentVersion`, `stepInput` (mapped input)
- `signal` / deadline for abort

### ToolInvokeResult

```ts
{
  code: string;
  ok: true;
  result: Record<string, unknown>;
} | {
  code: string;
  ok: false;
  error: string;
}
```

MVP policy: any `ok: false` **throws** and fails the agent step (no partial success swallowing). Results aggregated only when all declared tools succeed.

### ToolEnrichmentBundle

```ts
{
  tools: Array<{ code: string; result: Record<string, unknown> }>;
}
```

Injected into Prompt messages; not a new Shared Context key unless Workflow mapping already expects it.

## Filesystem layout (object-storage MVP)

```text
$TOOL_STORAGE_ROOT/
  └── {executionId}/
        └── {safeKey}
```

- Keys sanitized; reject `..` and absolute paths.
- URI returned as `file://` or relative path string documented in adapter output.

## Config entities (env)

| Key | Default | Meaning |
|-----|---------|---------|
| `TOOL_RUNTIME` | `stub` | `stub` \| `live` |
| `TOOL_STORAGE_ROOT` | `.data/tool-storage` | Filesystem root |
| `TOOL_RESULT_MAX_BYTES` | `262144` | Cap for search/browser bodies |

Commented placeholders (not required):

| Key | Future provider |
|-----|-----------------|
| `GOOGLE_CSE_API_KEY` / `GOOGLE_CSE_CX` | Google Custom Search |
| `BROWSERLESS_URL` / `BROWSERLESS_TOKEN` | Browserless |
| `FLUX_API_KEY` | Flux cloud |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` / `AWS_REGION` | AWS S3 |

## Validation rules

- Live invoke: tool must be published, enabled, `deletedAt == null`, version published.
- Unknown code / no adapter → step error.
- Result JSON size after serialize > max → truncate-with-marker for search/browser; storage writes enforce max file size separately (same cap unless plan adjusts).
- `TOOL_RUNTIME` invalid → bootstrap fail (Joi).
