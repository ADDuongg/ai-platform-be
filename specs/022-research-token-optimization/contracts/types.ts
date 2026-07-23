/**
 * Runtime / ops types for Research Pipeline & Token Optimization (022).
 * No NestJS / TypeORM imports. No new FE-callable HTTP routes.
 */

export type WebSearchProvider = 'serpapi' | 'duckduckgo' | 'google-cse' | 'gemini';

export type SerpApiEngine = 'google_shopping' | 'google';

export interface ResearchTokenOptimizationEnv {
  TOOL_RUNTIME: 'stub' | 'live';
  /** Required for SerpAPI primary path */
  SERPAPI_API_KEY?: string;
  SERPAPI_BASE_URL?: string;
  /** Future — Google Custom Search */
  GOOGLE_CSE_API_KEY?: string;
  GOOGLE_CSE_CX?: string;
  TOOL_RESULT_MAX_BYTES?: number;
}

/** Tool version configJson for code=web-search */
export interface WebSearchToolConfig {
  provider?: WebSearchProvider;
  /** Defaults to duckduckgo when primary differs */
  fallbackProvider?: WebSearchProvider;
  engine?: SerpApiEngine;
  /** How many items to fetch before preprocess (cap 100) */
  fetchLimit?: number;
  /** Top N after preprocess (default 20) */
  maxInputItems?: number;
  /** Alias for maxInputItems (backward compatible) */
  maxResults?: number;
  /** Max items kept per diversity bucket (default 5) */
  perBucket?: number;
  /**
   * Query templates with `{{var}}` from agent step input.
   * Used when input.query / input.queries are absent.
   * Example: "kids fashion trends {{season}} {{category}} {{market}}"
   */
  queryTemplates?: string[];
  /** Optional market code → display name map (extends defaults VN→Vietnam, …) */
  marketAliases?: Record<string, string>;
}

/** Projected item sent to LLM enrichment */
export interface SearchItemDto {
  title: string;
  /** Alias of sourceUrl — required for trend-evidence util */
  url: string;
  sourceUrl: string;
  brand?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  snippet?: string;
  bucket?: string;
  score?: number;
}

export interface WebSearchPreprocessMeta {
  rawCount: number;
  afterDedup: number;
  selectedCount: number;
  fallbackUsed: boolean;
  buckets: string[];
}

export interface WebSearchEnrichmentResult {
  provider: WebSearchProvider;
  source: string;
  query: string;
  queriesTried?: string[];
  results: SearchItemDto[];
  meta: WebSearchPreprocessMeta;
}
