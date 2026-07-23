/**
 * Thin FE client interface for LLM Catalog.
 * Method signatures only — FE implements HTTP against `llm-catalog-api.yaml` + `types.ts`.
 *
 * Persist selection via Agent Registry `PATCH /agents/{id}` with
 * `config.provider` + `config.model` (then publish draft).
 */

import type {
  ListLlmModelsQuery,
  LlmModelsResponse,
  LlmProvidersResponse,
} from './types';

/** Base path: `/api/v1` — requires Bearer JWT + `agents:read`. */
export interface LlmCatalogApiClient {
  listLlmProviders(): Promise<LlmProvidersResponse>;
  listLlmModels(query?: ListLlmModelsQuery): Promise<LlmModelsResponse>;
}
