import type { WebSearchEnrichmentResult, WebSearchToolConfig } from './types';

/**
 * Internal runtime surface only — no public HTTP client for 022.
 * Documented so FE/ops understand enrichment shape after live tool invoke.
 */
export interface WebSearchRuntimeClient {
  /**
   * Invoked internally by ToolInvoker when Agent toolRefs include `web-search`.
   * Not exposed as REST.
   */
  invoke(
    input: Record<string, unknown>,
    config: WebSearchToolConfig,
  ): Promise<WebSearchEnrichmentResult>;
}
