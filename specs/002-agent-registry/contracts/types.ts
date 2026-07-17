/**
 * FE / client contract types for Agent Registry.
 * Aligned with `agents-api.yaml` and Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

export type AgentStatus = 'draft' | 'published' | 'archived';

export type AgentVersionStatus = 'draft' | 'published';

export type CapabilityType =
  | 'research'
  | 'image_search'
  | 'analysis'
  | 'generation'
  | 'review'
  | 'translation'
  | 'custom';

export type AgentErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'AGENT_NOT_FOUND'
  | 'AGENT_CODE_EXISTS'
  | 'AGENT_VERSION_IMMUTABLE'
  | 'AGENT_DRAFT_VERSION_EXISTS'
  | 'AGENT_NO_DRAFT_TO_PUBLISH'
  | 'AGENT_INVALID_STATE'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

export interface ApiErrorBody {
  code: AgentErrorCode;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export type JsonObject = Record<string, unknown>;

export interface CreateAgentRequest {
  code: string;
  name: string;
  description?: string;
  capabilityType: CapabilityType;
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  config?: JsonObject;
  timeoutMs?: number;
  maxRetries?: number;
  promptRef?: string | null;
  toolRefs?: string[];
  changelog?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  capabilityType?: CapabilityType;
  inputSchema?: JsonObject;
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

export interface AgentListQuery {
  status?: AgentStatus;
  capabilityType?: CapabilityType;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export interface AgentResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  capabilityType: CapabilityType;
  status: AgentStatus;
  enabled: boolean;
  currentVersion: number | null;
  /** Present for admins when a parallel draft version exists */
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentListResponse {
  data: AgentResponse[];
  meta: PaginationMeta;
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

export interface AgentVersionListResponse {
  data: AgentVersionResponse[];
}

export interface MessageResponse {
  message: string;
}
