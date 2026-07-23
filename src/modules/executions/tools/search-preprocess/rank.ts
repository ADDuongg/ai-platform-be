import type { SearchItem } from './types';

const W_RELEVANCE = 0.35;
const W_FRESHNESS = 0.3;
const W_POPULARITY = 0.2;
const W_DIVERSITY = 0.15;

/**
 * Composite ranking (ADR §9). Mutates copies with `score`, returns sorted desc.
 */
export function rankSearchItems(items: SearchItem[], query: string): SearchItem[] {
  const brandCounts = new Map<string, number>();
  const hostCounts = new Map<string, number>();
  for (const item of items) {
    const brandKey = (item.brand || '').toLowerCase();
    if (brandKey) brandCounts.set(brandKey, (brandCounts.get(brandKey) ?? 0) + 1);
    const host = hostOf(item.sourceUrl || item.url);
    if (host) hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1);
  }

  const queryTerms = tokenize(query);
  const scored = items.map((item) => {
    const relevance = relevanceScore(item, queryTerms);
    const freshness = 0.5; // providers rarely expose date in MVP shopping rows
    const popularity = popularityScore(item);
    const diversity = diversityScore(item, brandCounts, hostCounts, items.length);
    const score =
      W_RELEVANCE * relevance +
      W_FRESHNESS * freshness +
      W_POPULARITY * popularity +
      W_DIVERSITY * diversity;
    return { ...item, score };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored;
}

function relevanceScore(item: SearchItem, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0.5;
  const hay = tokenize([item.title, item.snippet, item.brand].filter(Boolean).join(' '));
  if (hay.length === 0) return 0;
  let hits = 0;
  for (const term of queryTerms) {
    if (hay.includes(term)) hits += 1;
  }
  return Math.min(1, hits / queryTerms.length);
}

function popularityScore(item: SearchItem): number {
  const rating = item.rating != null ? Math.min(1, Math.max(0, item.rating / 5)) : 0.4;
  const reviews = item.reviewCount != null ? Math.min(1, Math.log10(item.reviewCount + 1) / 4) : 0.3;
  return 0.6 * rating + 0.4 * reviews;
}

function diversityScore(
  item: SearchItem,
  brandCounts: Map<string, number>,
  hostCounts: Map<string, number>,
  total: number,
): number {
  if (total <= 1) return 1;
  const brandKey = (item.brand || '').toLowerCase();
  const host = hostOf(item.sourceUrl || item.url);
  const brandFreq = brandKey ? (brandCounts.get(brandKey) ?? 1) : 1;
  const hostFreq = host ? (hostCounts.get(host) ?? 1) : 1;
  // rarer brand/host → higher diversity
  const brandDiv = 1 - (brandFreq - 1) / total;
  const hostDiv = 1 - (hostFreq - 1) / total;
  return Math.max(0, Math.min(1, 0.5 * brandDiv + 0.5 * hostDiv));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}
