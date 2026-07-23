/**
 * FE / client contract types for Domain Audit Logs.
 * Aligned with `audit-logs-api.yaml` and Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

// ─── Shared enums & literals ────────────────────────────────────────────────

export type AuditDomain = 'agent' | 'workflow' | 'tool' | 'prompt' | 'execution';

export type AuditAction =
  | 'created'
  | 'updated'
  | 'published'
  | 'enabled'
  | 'disabled'
  | 'archived'
  | 'deleted'
  | 'execution_started'
  | 'execution_cancelled'
  | 'execution_retried'
  | 'llm_config_changed';

export type AuditErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'AUDIT_LOG_NOT_FOUND'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

// ─── API envelopes ──────────────────────────────────────────────────────────

export interface ApiErrorBody {
  code: AuditErrorCode;
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

// ─── Resources ──────────────────────────────────────────────────────────────

export interface AuditLogResponse {
  id: string;
  domain: AuditDomain;
  action: AuditAction | string;
  resourceType: string;
  resourceId: string;
  resourceCode: string | null;
  actorUserId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: JsonObject | null;
  createdAt: string;
}

export interface AuditLogListQuery {
  domain?: AuditDomain;
  action?: AuditAction | string;
  resourceId?: string;
  resourceCode?: string;
  actorUserId?: string;
  /** ISO-8601 */
  createdFrom?: string;
  /** ISO-8601 */
  createdTo?: string;
  page?: number;
  limit?: number;
}

export type AuditLogListResponse = ApiSuccessResponse<AuditLogResponse[]> & {
  meta: PaginationMeta;
};

export type AuditLogDetailResponse = ApiSuccessResponse<AuditLogResponse>;
