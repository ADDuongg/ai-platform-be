/** Registered web-search backends. Add new ids here when implementing providers. */
export type WebSearchProviderId =
  | 'serpapi'
  | 'tavily'
  | 'duckduckgo'
  | 'google-cse'
  | 'gemini';

export type SearchItemKind = 'shopping' | 'article' | 'other';

export type WebSearchProviderRequest = {
  query: string;
  fetchLimit: number;
  timeoutMs: number;
  maxBytes: number;
  input: Record<string, unknown>;
  configJson: Record<string, unknown>;
  /** TOOL_STORAGE_ROOT — raw JSON may be persisted under `{storageRoot}/web-search/`. */
  storageRoot?: string;
};

export type WebSearchProviderResult = {
  provider: WebSearchProviderId;
  /** Provider-specific source label (e.g. duckduckgo-html, serpapi-google_shopping) */
  source: string;
  rows: import('../../search-preprocess').RawSearchRow[];
  /** Relative path under storageRoot when raw response was persisted. */
  persistedPath?: string;
};

/**
 * Pluggable search backend for `web-search` tool.
 * Implement this to add SerpAPI / Tavily / DuckDuckGo / Google CSE / Gemini grounding, etc.
 */
export interface WebSearchProvider {
  readonly id: WebSearchProviderId;
  /** True when env/config allows this provider to run. */
  isAvailable(configJson: Record<string, unknown>): boolean;
  search(request: WebSearchProviderRequest): Promise<WebSearchProviderResult>;
}
