/**
 * FE contracts — Builder Node I/O Mapping (019).
 * Implementation-agnostic: no Nest/TypeORM imports.
 *
 * Mapping semantics (Execution engine):
 * - inputMapping:  mappedInput[left] = context[right]
 * - outputMapping: nextContext[left] = agentOutput[right]
 *
 * Prefer string path values (`season`, `trendFindings.summary`).
 * Do not use `$.input.*` prefixes.
 */

// ─── Mapping helpers (FE UI) ────────────────────────────────────────────────

/** One editor row before converting to Record. */
export interface MappingPair {
  left: string;
  right: string;
}

/**
 * Persisted node map. MVP UI authors string paths; engine may retain non-strings.
 */
export type NodeIoMapping = Record<string, string | unknown>;

export function mappingPairsToRecord(pairs: MappingPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const left = pair.left.trim();
    const right = pair.right.trim();
    if (!left || !right) continue;
    out[left] = right;
  }
  return out;
}

export function recordToMappingPairs(mapping?: NodeIoMapping | null): MappingPair[] {
  if (!mapping) return [];
  return Object.entries(mapping).map(([left, right]) => ({
    left,
    right: typeof right === 'string' ? right : JSON.stringify(right),
  }));
}

// ─── Definition graph (subset) ──────────────────────────────────────────────

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
  inputMapping?: NodeIoMapping;
  outputMapping?: NodeIoMapping;
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
  policies?: Record<string, unknown>;
}

export type WorkflowStatus = 'draft' | 'published' | 'archived';

export interface WorkflowDetail {
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
  inputMapping?: NodeIoMapping;
  outputMapping?: NodeIoMapping;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  config?: Record<string, unknown>;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  meta?: Record<string, unknown>;
}

export type WorkflowDefinitionResponse = ApiSuccessEnvelope<WorkflowDefinitionSnapshot>;
export type WorkflowDetailResponse = ApiSuccessEnvelope<WorkflowDetail>;

/** Common error codes FE may surface for this flow. */
export type NodeIoMappingErrorCode =
  | 'WORKFLOW_NOT_FOUND'
  | 'WORKFLOW_VERSION_IMMUTABLE'
  | 'WORKFLOW_NO_DRAFT_TO_PUBLISH'
  | 'WORKFLOW_INVALID_GRAPH'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | string;
