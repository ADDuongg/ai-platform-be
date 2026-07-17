/**
 * FE / client contract types for Prompt Library.
 * Aligned with `prompts-api.yaml` and Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

export type PromptStatus = 'draft' | 'published' | 'archived';

export type PromptVersionStatus = 'draft' | 'published';

export type PromptMessageRole = 'system' | 'user' | 'assistant';

export type PromptErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PROMPT_NOT_FOUND'
  | 'PROMPT_CODE_EXISTS'
  | 'PROMPT_VERSION_IMMUTABLE'
  | 'PROMPT_DRAFT_VERSION_EXISTS'
  | 'PROMPT_NO_DRAFT_TO_PUBLISH'
  | 'PROMPT_EMPTY_CONTENT'
  | 'PROMPT_INVALID_STATE'
  | 'PROMPT_NOT_ASSIGNABLE'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

export interface ApiErrorBody {
  code: PromptErrorCode;
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

export interface PromptMessage {
  role: PromptMessageRole;
  content: string;
}

export interface CreatePromptRequest {
  code: string;
  name: string;
  description?: string;
  category?: string | null;
  tags?: string[];
  /** Optional at create; may be empty */
  template?: string | null;
  /** Optional at create; may be empty */
  messages?: PromptMessage[] | null;
  variablesSchema?: JsonObject;
  modelHints?: JsonObject;
  changelog?: string;
}

export interface UpdatePromptRequest {
  name?: string;
  description?: string;
  category?: string | null;
  tags?: string[];
  template?: string | null;
  messages?: PromptMessage[] | null;
  variablesSchema?: JsonObject;
  modelHints?: JsonObject;
  changelog?: string;
}

export interface CreatePromptVersionRequest {
  changelog?: string;
}

export interface PromptListQuery {
  status?: PromptStatus;
  category?: string;
  tag?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export interface PromptResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: PromptStatus;
  enabled: boolean;
  currentVersion: number | null;
  /** Present for admins when a parallel draft version exists */
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptListResponse {
  data: PromptResponse[];
  meta: PaginationMeta;
}

export interface PromptVersionResponse {
  id: string;
  promptId: string;
  version: number;
  status: PromptVersionStatus;
  template: string | null;
  messages: PromptMessage[] | null;
  variablesSchema: JsonObject;
  modelHints: JsonObject;
  changelog: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface PromptVersionListResponse {
  data: PromptVersionResponse[];
}

export interface MessageResponse {
  message: string;
}
