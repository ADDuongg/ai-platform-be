/**
 * Thin FE client interface for Domain Audit Logs.
 * Method signatures only — FE implements HTTP against `audit-logs-api.yaml` + `types.ts`.
 */

import type {
  AuditLogDetailResponse,
  AuditLogListQuery,
  AuditLogListResponse,
} from './types';

/** Base path: `/api/v1` — requires Bearer JWT + `audit:read`. */
export interface AuditLogsApiClient {
  listAuditLogs(query?: AuditLogListQuery): Promise<AuditLogListResponse>;
  getAuditLog(id: string): Promise<AuditLogDetailResponse>;
}
