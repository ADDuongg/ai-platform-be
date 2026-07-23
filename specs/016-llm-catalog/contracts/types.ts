/**
 * FE / client contract types for LLM Catalog.
 * Aligned with `llm-catalog-api.yaml` and Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

export type LlmProviderId = 'openai' | 'anthropic' | 'ollama' | 'gemini';

export type LlmCatalogErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | string;

export interface ApiErrorBody {
  code: LlmCatalogErrorCode;
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

export interface LlmModel {
  id: string;
  label: string;
}

export interface LlmProvider {
  id: LlmProviderId | string;
  label: string;
  defaultModel: string;
  /** True when provider credentials / base URL are present in env. */
  configured: boolean;
  models: LlmModel[];
}

export interface ListLlmModelsQuery {
  /** When set, return models for that provider only. */
  provider?: LlmProviderId | string;
}

export type LlmProvidersResponse = ApiSuccessResponse<LlmProvider[]>;
export type LlmModelsResponse = ApiSuccessResponse<LlmModel[]>;
