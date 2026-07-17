/**
 * FE / client contract types for Tool Library.
 * Aligned with `tools-api.yaml` and Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

export type ToolStatus = 'draft' | 'published' | 'archived';

export type ToolVersionStatus = 'draft' | 'published';

export type ToolType =
  | 'search'
  | 'browser'
  | 'image_generation'
  | 'storage'
  | 'http'
  | 'custom';

export type ToolErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'TOOL_NOT_FOUND'
  | 'TOOL_CODE_EXISTS'
  | 'TOOL_VERSION_IMMUTABLE'
  | 'TOOL_DRAFT_VERSION_EXISTS'
  | 'TOOL_NO_DRAFT_TO_PUBLISH'
  | 'TOOL_INVALID_STATE'
  | 'TOOL_TYPE_IMMUTABLE'
  | 'TOOL_SECRET_IN_CONFIG'
  | 'TOOL_NOT_ASSIGNABLE'
  | 'TOOL_REFS_INVALID'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

export interface ApiErrorBody {
  code: ToolErrorCode;
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

export interface CreateToolRequest {
  code: string;
  name: string;
  description?: string | null;
  toolType: ToolType;
  /** Optional at create; may be empty; must not contain plaintext secret-shaped keys */
  config?: JsonObject;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  secretRef?: string | null;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  changelog?: string;
}

export interface UpdateToolRequest {
  name?: string;
  description?: string | null;
  /** Cannot change toolType or code */
  config?: JsonObject;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  secretRef?: string | null;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  changelog?: string;
}

export interface CreateToolVersionRequest {
  changelog?: string;
}

export interface ToolListQuery {
  status?: ToolStatus;
  toolType?: ToolType;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export interface ToolResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  toolType: ToolType;
  status: ToolStatus;
  enabled: boolean;
  currentVersion: number | null;
  /** Present for admins when a parallel draft version exists */
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolListResponse {
  data: ToolResponse[];
  meta: PaginationMeta;
}

export interface ToolVersionResponse {
  id: string;
  toolId: string;
  version: number;
  status: ToolVersionStatus;
  config: JsonObject;
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  secretRef: string | null;
  timeoutMs: number | null;
  maxRetries: number | null;
  changelog: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface ToolVersionListResponse {
  data: ToolVersionResponse[];
}

export interface MessageResponse {
  message: string;
}

/** Agent assignment constraint mirrored for FE docs (enforced on Agents APIs). */
export const TOOL_REFS_MAX = 20;
