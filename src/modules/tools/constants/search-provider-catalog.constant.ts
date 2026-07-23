/**
 * Static allowlist of web-search providers for FE Tool config selects.
 * Runtime adapters live under executions/tools/adapters/web-search/providers —
 * catalog ids MUST match WebSearchProviderId.
 */
export type SearchProviderCatalogId =
  | 'serpapi'
  | 'tavily'
  | 'duckduckgo'
  | 'google-cse'
  | 'gemini';

export type SearchProviderCatalogEntry = {
  id: SearchProviderCatalogId;
  label: string;
  /** Optional SerpAPI engines exposed in Fields UI */
  engines?: readonly string[];
  canBeFallback: boolean;
  /** Env key(s) that gate `configured` */
  requiresEnv?: readonly string[];
};

export const SEARCH_PROVIDER_CATALOG: readonly SearchProviderCatalogEntry[] = [
  {
    id: 'serpapi',
    label: 'SerpAPI',
    engines: ['google_shopping', 'google'],
    canBeFallback: true,
    requiresEnv: ['SERPAPI_API_KEY'],
  },
  {
    id: 'tavily',
    label: 'Tavily',
    canBeFallback: true,
    requiresEnv: ['TAVILY_API_KEY'],
  },
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    canBeFallback: true,
  },
  {
    id: 'google-cse',
    label: 'Google Custom Search',
    canBeFallback: false,
    requiresEnv: ['GOOGLE_CSE_API_KEY', 'GOOGLE_CSE_CX'],
  },
  {
    id: 'gemini',
    label: 'Gemini Grounding (coming soon)',
    canBeFallback: false,
    requiresEnv: ['GEMINI_API_KEY'],
  },
];
