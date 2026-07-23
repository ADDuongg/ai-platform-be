import type { WebSearchProviderId } from './web-search.provider';

export const DEFAULT_FETCH_LIMIT = 50;
export const MAX_FETCH_LIMIT = 100;
export const DEFAULT_MAX_INPUT_ITEMS = 20;
export const DEFAULT_PER_BUCKET = 5;
export const DEFAULT_PRIMARY_PROVIDER: WebSearchProviderId = 'serpapi';
export const DEFAULT_FALLBACK_PROVIDER: WebSearchProviderId = 'duckduckgo';
/** Default hybrid fan-out when `providers` is omitted but both keys may exist. */
export const DEFAULT_HYBRID_PROVIDERS: WebSearchProviderId[] = ['serpapi', 'tavily'];

export type KindMix = {
  shopping: number;
  article: number;
};

export function resolveFetchLimit(configJson: Record<string, unknown>): number {
  const n =
    typeof configJson.fetchLimit === 'number' && configJson.fetchLimit > 0
      ? configJson.fetchLimit
      : DEFAULT_FETCH_LIMIT;
  return Math.min(Math.floor(n), MAX_FETCH_LIMIT);
}

export function resolveMaxInputItems(configJson: Record<string, unknown>): number {
  if (typeof configJson.maxInputItems === 'number' && configJson.maxInputItems > 0) {
    return Math.floor(configJson.maxInputItems);
  }
  if (typeof configJson.maxResults === 'number' && configJson.maxResults > 0) {
    return Math.floor(configJson.maxResults);
  }
  return DEFAULT_MAX_INPUT_ITEMS;
}

export function resolvePerBucket(configJson: Record<string, unknown>): number {
  if (typeof configJson.perBucket === 'number' && configJson.perBucket > 0) {
    return Math.floor(configJson.perBucket);
  }
  return DEFAULT_PER_BUCKET;
}

/**
 * Absolute shopping/article caps for hybrid Top N.
 * - `kindMix: { shopping, article }` absolute counts
 * - default 50/50 of maxInputItems when multiple providers fan-out
 */
export function resolveKindMix(
  configJson: Record<string, unknown>,
  maxInputItems: number,
  hybrid: boolean,
): KindMix | undefined {
  if (!hybrid) return undefined;
  const raw = configJson.kindMix;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const shopping = positiveInt(obj.shopping) ?? Math.ceil(maxInputItems / 2);
    const article = positiveInt(obj.article) ?? Math.floor(maxInputItems / 2);
    return {
      shopping: Math.min(shopping, maxInputItems),
      article: Math.min(article, maxInputItems),
    };
  }
  return {
    shopping: Math.ceil(maxInputItems / 2),
    article: Math.floor(maxInputItems / 2),
  };
}

/**
 * Providers to fan-out (hybrid). Precedence:
 * 1. `providers: string[]`
 * 2. single `provider` (legacy primary-only)
 * 3. default `['serpapi', 'tavily']`
 */
export function resolveProviders(configJson: Record<string, unknown>): WebSearchProviderId[] {
  if (Array.isArray(configJson.providers)) {
    const parsed = configJson.providers
      .map((item) => parseProviderId(item))
      .filter((id): id is WebSearchProviderId => Boolean(id));
    const unique = [...new Set(parsed)];
    if (unique.length > 0) return unique;
  }
  const single = parseProviderId(configJson.provider);
  if (single) return [single];
  return [...DEFAULT_HYBRID_PROVIDERS];
}

/**
 * Resolve optional fallback when hybrid/fan-out yields no rows.
 * - `fallbackProvider` defaults to duckduckgo
 * - omitted when same as the only fan-out provider
 */
export function resolveFallbackProvider(
  configJson: Record<string, unknown>,
  providers: WebSearchProviderId[],
): WebSearchProviderId | undefined {
  const fallbackRaw = parseProviderId(configJson.fallbackProvider) ?? DEFAULT_FALLBACK_PROVIDER;
  if (providers.length === 1 && providers[0] === fallbackRaw) return undefined;
  if (providers.includes(fallbackRaw) && providers.length > 1) {
    // Still allow DDG as last-resort even if listed — adapter skips if already attempted
  }
  return fallbackRaw;
}

/** @deprecated Prefer resolveProviders + resolveFallbackProvider */
export function resolveProviderChain(configJson: Record<string, unknown>): {
  primary: WebSearchProviderId;
  fallback?: WebSearchProviderId;
} {
  const providers = resolveProviders(configJson);
  const primary = providers[0] ?? DEFAULT_PRIMARY_PROVIDER;
  const fallback = resolveFallbackProvider(configJson, providers);
  return { primary, fallback };
}

export function parseProviderId(value: unknown): WebSearchProviderId | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const id = value.trim().toLowerCase();
  if (
    id === 'serpapi' ||
    id === 'tavily' ||
    id === 'duckduckgo' ||
    id === 'google-cse' ||
    id === 'gemini'
  ) {
    return id;
  }
  return undefined;
}

export function firstTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function marketToGl(market: string): string {
  const map: Record<string, string> = {
    VN: 'vn',
    vn: 'vn',
    Vietnam: 'vn',
    US: 'us',
    'United States': 'us',
    UK: 'uk',
    'United Kingdom': 'uk',
    JP: 'jp',
    Japan: 'jp',
    KR: 'kr',
    Korea: 'kr',
  };
  return map[market] ?? (market.length === 2 ? market.toLowerCase() : '');
}

function positiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  return undefined;
}
