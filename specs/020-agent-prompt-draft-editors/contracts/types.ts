/**
 * FE contracts — Agent / Prompt draft editors (020).
 * Subset of Agent Registry (002) + Prompt Library (006) for draft edit flows.
 * Implementation-agnostic: no Nest/TypeORM imports.
 *
 * MVP: Prompt template + Agent I/O field forms + Advanced JSON.
 * Fast follow: Prompt variables form (helpers included for later).
 */

// ─── Shared envelopes ───────────────────────────────────────────────────────

export type JsonObject = Record<string, unknown>;

export type DraftEditorErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_VERSION_IMMUTABLE'
  | 'AGENT_DRAFT_VERSION_EXISTS'
  | 'AGENT_NO_DRAFT_TO_PUBLISH'
  | 'PROMPT_NOT_FOUND'
  | 'PROMPT_VERSION_IMMUTABLE'
  | 'PROMPT_DRAFT_VERSION_EXISTS'
  | 'PROMPT_NO_DRAFT_TO_PUBLISH'
  | 'PROMPT_EMPTY_CONTENT'
  | string;

export interface ApiErrorBody {
  code: DraftEditorErrorCode;
  message: string;
  details: unknown | null;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
  path: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

// ─── Permissions (FE gate + BE Guard) ───────────────────────────────────────

export type AgentDraftPermission =
  | 'agents:read'
  | 'agents:update'
  | 'agents:publish';

export type PromptDraftPermission =
  | 'prompts:read'
  | 'prompts:update'
  | 'prompts:publish';

// ─── Schema field form (FE → JSON Schema) ───────────────────────────────────

/** MVP types on the simple Agent (and future Prompt variables) form. */
export type SchemaFieldType = 'string' | 'number' | 'boolean';

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required: boolean;
}

/** Identifier: letter/underscore first, then letters, digits, underscore. */
export const SCHEMA_FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidSchemaFieldName(name: string): boolean {
  return SCHEMA_FIELD_NAME_PATTERN.test(name.trim());
}

export interface ObjectSchemaDocument {
  type: 'object';
  properties: Record<string, { type: SchemaFieldType }>;
  required?: string[];
}

/**
 * Build a flat object schema from form fields (full replace document).
 * Drops incomplete rows; last duplicate name wins after validation should block dupes.
 */
export function fieldsToObjectSchema(fields: SchemaField[]): ObjectSchemaDocument {
  const properties: Record<string, { type: SchemaFieldType }> = {};
  const required: string[] = [];
  for (const field of fields) {
    const name = field.name.trim();
    if (!name || !isValidSchemaFieldName(name)) continue;
    properties[name] = { type: field.type };
    if (field.required) required.push(name);
  }
  const doc: ObjectSchemaDocument = { type: 'object', properties };
  if (required.length > 0) doc.required = required;
  return doc;
}

/**
 * Extract flat form rows from a schema document.
 * Only top-level properties with simple string type in MVP set become fields.
 * Returns `complex: true` when nested/non-flat constructs are detected.
 */
export function objectSchemaToFields(schema: JsonObject | null | undefined): {
  fields: SchemaField[];
  complex: boolean;
} {
  if (!schema || typeof schema !== 'object') {
    return { fields: [], complex: false };
  }
  const properties = schema.properties;
  const requiredList = Array.isArray(schema.required)
    ? schema.required.filter((x): x is string => typeof x === 'string')
    : [];
  const requiredSet = new Set(requiredList);

  let complex = schema.type !== undefined && schema.type !== 'object';
  const fields: SchemaField[] = [];

  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    complex = complex || Boolean(properties);
    return { fields, complex };
  }

  for (const [name, raw] of Object.entries(properties as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      complex = true;
      continue;
    }
    const prop = raw as Record<string, unknown>;
    const t = prop.type;
    const simple =
      t === 'string' || t === 'number' || t === 'boolean'
        ? (t as SchemaFieldType)
        : null;
    if (
      !simple ||
      prop.properties !== undefined ||
      prop.items !== undefined ||
      prop.oneOf !== undefined ||
      prop.anyOf !== undefined ||
      prop.allOf !== undefined
    ) {
      complex = true;
      if (!simple) continue;
    }
    fields.push({
      name,
      type: simple,
      required: requiredSet.has(name),
    });
  }

  // Extra JSON Schema keywords often imply complexity beyond flat form.
  for (const key of Object.keys(schema)) {
    if (
      ![
        'type',
        'properties',
        'required',
        '$schema',
        'title',
        'description',
        'additionalProperties',
      ].includes(key)
    ) {
      complex = true;
    }
  }

  return { fields, complex };
}

// ─── Agent draft API types (subset of 002) ──────────────────────────────────

export type AgentStatus = 'draft' | 'published' | 'archived';
export type AgentVersionStatus = 'draft' | 'published';

export interface UpdateAgentDraftRequest {
  name?: string;
  description?: string;
  /** Primary form / Advanced: draft input schema */
  inputSchema?: JsonObject;
  /** Primary form / Advanced: draft output schema */
  outputSchema?: JsonObject;
  config?: JsonObject;
  timeoutMs?: number;
  maxRetries?: number;
  promptRef?: string | null;
  toolRefs?: string[];
  changelog?: string;
}

export interface CreateAgentVersionRequest {
  changelog?: string;
}

export interface AgentSummaryResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  enabled: boolean;
  currentVersion: number | null;
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVersionResponse {
  id: string;
  agentId: string;
  version: number;
  status: AgentVersionStatus;
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  config: JsonObject;
  timeoutMs: number | null;
  maxRetries: number | null;
  promptRef: string | null;
  toolRefs: string[];
  changelog: string | null;
  publishedAt: string | null;
  createdAt: string;
}

// ─── Prompt draft API types (subset of 006) ─────────────────────────────────

export type PromptStatus = 'draft' | 'published' | 'archived';
export type PromptVersionStatus = 'draft' | 'published';

export interface UpdatePromptDraftRequest {
  name?: string;
  description?: string;
  category?: string | null;
  tags?: string[];
  /** MVP primary edit */
  template?: string | null;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | null;
  /** Fast follow (US4) */
  variablesSchema?: JsonObject;
  modelHints?: JsonObject;
  changelog?: string;
}

export interface CreatePromptVersionRequest {
  changelog?: string;
}

export interface PromptSummaryResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: PromptStatus;
  enabled: boolean;
  currentVersion: number | null;
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersionResponse {
  id: string;
  promptId: string;
  version: number;
  status: PromptVersionStatus;
  template: string | null;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> | null;
  variablesSchema: JsonObject;
  modelHints: JsonObject;
  changelog: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface MessageResponse {
  message: string;
}
