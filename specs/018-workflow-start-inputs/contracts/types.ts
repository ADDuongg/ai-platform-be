/**
 * FE / client contract types for Workflow start inputs + Builder I/O mapping.
 * Aligned with `workflow-start-inputs-api.yaml` and existing Nest envelopes.
 * Do not import NestJS / TypeORM types here.
 *
 * Persist policies via `PUT /workflows/{id}/definition`.
 * BE enforces `requiredInputs` at Execution start; `inputSchema` is FE UI metadata.
 */

// ─── Policies / start fields ────────────────────────────────────────────────

/** FE-owned widget catalog (Phase A.2). Unknown values → render as text. */
export type StartInputWidget = 'text' | 'textarea' | 'select' | 'date';

export interface StartInputFieldSchema {
  label?: string;
  widget?: StartInputWidget | string;
  /** When widget is `select`. */
  options?: string[];
  placeholder?: string;
  /**
   * Prefill value on Modules Start form.
   * Does not satisfy requiredness by itself — operator may clear it;
   * BE still enforces non-blank `requiredInputs` at execute.
   */
  default?: string | number | boolean | null;
}

/**
 * Workflow-level policies relevant to start forms.
 * Other policy keys may exist; FE should preserve them on PUT.
 */
export interface WorkflowStartPolicies {
  /** Keys that must be non-blank in Execution start `input`. */
  requiredInputs?: string[];
  /**
   * Optional UI metadata keyed by field name (Phase A.2+).
   * Does not imply requiredness.
   */
  inputSchema?: Record<string, StartInputFieldSchema>;
}

// ─── Definition graph (subset FE needs) ─────────────────────────────────────

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: 'agent';
  agentCode: string;
  agentVersion?: number | null;
  label?: string | null;
  position?: WorkflowNodePosition | null;
  /** Phase B — map execution/context → agent input. */
  inputMapping?: Record<string, unknown>;
  /** Phase B — map agent output → context. */
  outputMapping?: Record<string, unknown>;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: null;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
  /**
   * Prefer reading/writing typed start fields via WorkflowStartPolicies.
   * Preserve unknown keys when round-tripping.
   */
  policies?: WorkflowStartPolicies & Record<string, unknown>;
}

// ─── Workflow catalog ───────────────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'published' | 'archived';

export interface WorkflowSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: WorkflowStatus;
  currentVersion: number | null;
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListQuery {
  status?: WorkflowStatus;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

// ─── Definition I/O ─────────────────────────────────────────────────────────

export interface WorkflowDefinitionSnapshot {
  workflowId: string;
  version: number;
  /** Nest field name (not `status`). */
  versionStatus: 'draft' | 'published' | string;
  definition: WorkflowDefinition;
}

export interface ReplaceWorkflowDefinitionRequest {
  definition: WorkflowDefinition;
  changelog?: string;
}

export interface UpdateWorkflowNodeRequest {
  agentCode?: string;
  agentVersion?: number | null;
  label?: string | null;
  position?: WorkflowNodePosition | null;
  inputMapping?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  config?: Record<string, unknown>;
}

// ─── Execution start ────────────────────────────────────────────────────────

export interface ExecuteWorkflowRequest {
  /** Pin published version; omit to use current published. */
  version?: number | null;
  /**
   * Start input object. Keys should cover `policies.requiredInputs`.
   * Phase A.1 values are typically strings from text fields.
   */
  input?: Record<string, unknown>;
}

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowCode: string;
  workflowVersion: number;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
  error: Record<string, unknown> | null;
  startedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API envelopes ──────────────────────────────────────────────────────────

export type WorkflowStartInputsErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'WORKFLOW_NOT_FOUND'
  | 'WORKFLOW_NO_DRAFT_TO_PUBLISH'
  | 'WORKFLOW_INVALID_GRAPH'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

export interface ApiErrorBody {
  code: WorkflowStartInputsErrorCode;
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

export type WorkflowListResponse = ApiSuccessResponse<WorkflowSummary[]> & {
  meta?: PaginationMeta & Record<string, unknown>;
};
export type WorkflowDetailResponse = ApiSuccessResponse<WorkflowSummary>;
export type WorkflowDefinitionResponse = ApiSuccessResponse<WorkflowDefinitionSnapshot>;
export type ExecutionResponse = ApiSuccessResponse<ExecutionSummary>;
export type MessageResponse = ApiSuccessResponse<{ message: string }>;

// ─── FE helpers (non-HTTP) ──────────────────────────────────────────────────

/** Phase A.1: one text field per required key. */
export interface DynamicStartField {
  key: string;
  required: true;
  label: string;
  widget: StartInputWidget | string;
  options?: string[];
  placeholder?: string;
  default?: string | number | boolean | null;
}

/**
 * Build Modules form model from published definition policies.
 * - requiredness from `requiredInputs` only
 * - widget/label/default from `inputSchema` when present (A.2); else text + title-case key
 */
export function buildDynamicStartFields(
  policies: WorkflowStartPolicies | undefined | null,
): DynamicStartField[] {
  const keys = Array.isArray(policies?.requiredInputs)
    ? [...new Set(policies!.requiredInputs!.filter((k) => typeof k === 'string' && k.trim()))]
    : [];
  const schema = policies?.inputSchema ?? {};
  return keys.map((key) => {
    const meta = schema[key];
    const widget = meta?.widget && String(meta.widget).trim() ? String(meta.widget) : 'text';
    return {
      key,
      required: true as const,
      label: meta?.label?.trim() || titleCaseKey(key),
      widget,
      options: Array.isArray(meta?.options) ? meta!.options : undefined,
      placeholder: meta?.placeholder,
      default: meta?.default ?? null,
    };
  });
}

export function titleCaseKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
