/**
 * Client/docs types for Tool Runtime Adapters.
 * No NestJS / TypeORM imports — FE and ops docs may consume these.
 */

export type ToolRuntimeMode = 'stub' | 'live';

export type MvpToolCode =
  | 'web-search'
  | 'web-browser'
  | 'image-generation'
  | 'object-storage';

export type FuturePaidProvider =
  | 'google-cse'
  | 'browserless'
  | 'aws-s3';

export type MvpToolProvider =
  | 'duckduckgo'
  | 'native-fetch'
  | 'flux'
  | 'stub-live'
  | 'filesystem';

export interface ToolRuntimeEnvConfig {
  TOOL_RUNTIME: ToolRuntimeMode;
  TOOL_STORAGE_ROOT?: string;
  TOOL_RESULT_MAX_BYTES?: number;
  /** Future — Google Custom Search (not required for MVP) */
  GOOGLE_CSE_API_KEY?: string;
  GOOGLE_CSE_CX?: string;
  /** Future — Browserless */
  BROWSERLESS_URL?: string;
  BROWSERLESS_TOKEN?: string;
  /** Flux / BFL image-generation (provider=flux) */
  FLUX_API_KEY?: string;
  /** Alias accepted when FLUX_API_KEY unset */
  BFL_API_KEY?: string;
  FLUX_BASE_URL?: string;
  FLUX_ENDPOINT_PATH?: string;
  FLUX_POLL_INTERVAL_MS?: number;
  /** Future — AWS S3 */
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  AWS_REGION?: string;
}

export interface ToolEnrichmentItem {
  code: string;
  result: Record<string, unknown>;
}

export interface ToolEnrichmentBundle {
  tools: ToolEnrichmentItem[];
}

/** Reused Execution request (unchanged). */
export interface ExecuteWorkflowRequest {
  input?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ExecutionSummary {
  id: string;
  status: string;
  workflowId: string;
}

export interface ExecutionDetail extends ExecutionSummary {
  sharedContext?: Record<string, unknown>;
}

export interface ExecutionStep {
  id: string;
  status: string;
  agentCode?: string;
  error?: string | null;
}

export interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
  traceId?: string;
}
