import type { SearchItem } from './types';

const KEYWORD_BUCKETS: Array<{ bucket: string; patterns: RegExp[] }> = [
  { bucket: 'pastel', patterns: [/\bpastel\b/i, /\bmint\b/i, /\blavender\b/i, /\bcream\b/i] },
  { bucket: 'ocean', patterns: [/\bocean\b/i, /\bmarine\b/i, /\bnavy\b/i, /\bsea\b/i] },
  { bucket: 'animal', patterns: [/\banimal\b/i, /\bprint\b/i, /\bdino\b/i, /\bleopard\b/i] },
  { bucket: 'space', patterns: [/\bspace\b/i, /\bgalaxy\b/i, /\bstar\b/i, /\buniverse\b/i] },
  { bucket: 'sport', patterns: [/\bsport\b/i, /\bathletic\b/i, /\bactive\b/i] },
  { bucket: 'denim', patterns: [/\bdenim\b/i, /\bjeans\b/i] },
];

/**
 * Assign buckets and take up to `perBucket` from each (round-robin by rank order),
 * then fill remaining slots up to `maxInputItems`.
 */
export function bucketSampleSearchItems(
  ranked: SearchItem[],
  maxInputItems: number,
  perBucket: number,
): SearchItem[] {
  if (maxInputItems <= 0) return [];
  const withBuckets = ranked.map((item) => ({
    ...item,
    bucket: item.bucket || assignBucket(item),
  }));

  const byBucket = new Map<string, SearchItem[]>();
  for (const item of withBuckets) {
    const key = item.bucket || 'other';
    const list = byBucket.get(key) ?? [];
    list.push(item);
    byBucket.set(key, list);
  }

  const selected: SearchItem[] = [];
  const selectedUrls = new Set<string>();
  const bucketKeys = [...byBucket.keys()].sort();

  for (const key of bucketKeys) {
    const list = byBucket.get(key) ?? [];
    let taken = 0;
    for (const item of list) {
      if (selected.length >= maxInputItems) break;
      if (taken >= perBucket) break;
      const urlKey = item.sourceUrl || item.url;
      if (selectedUrls.has(urlKey)) continue;
      selected.push(item);
      selectedUrls.add(urlKey);
      taken += 1;
    }
  }

  if (selected.length < maxInputItems) {
    for (const item of withBuckets) {
      if (selected.length >= maxInputItems) break;
      const urlKey = item.sourceUrl || item.url;
      if (selectedUrls.has(urlKey)) continue;
      selected.push(item);
      selectedUrls.add(urlKey);
    }
  }

  return selected.slice(0, maxInputItems);
}

export function assignBucket(item: SearchItem): string {
  const text = [item.title, item.snippet, item.brand].filter(Boolean).join(' ');
  for (const { bucket, patterns } of KEYWORD_BUCKETS) {
    if (patterns.some((re) => re.test(text))) return bucket;
  }
  if (item.brand?.trim()) {
    return `brand:${item.brand.trim().toLowerCase().slice(0, 32)}`;
  }
  try {
    const host = new URL(item.sourceUrl || item.url).hostname.replace(/^www\./i, '');
    return `host:${host.slice(0, 48)}`;
  } catch {
    return 'other';
  }
}
