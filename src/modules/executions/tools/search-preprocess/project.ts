import type { SearchItem } from './types';

const PROJECTED_KEYS = [
  'title',
  'url',
  'sourceUrl',
  'brand',
  'price',
  'rating',
  'reviewCount',
  'imageUrl',
  'snippet',
  'bucket',
  'score',
  'kind',
  'provider',
] as const;

/** Keep only fields needed for Research LLM enrichment. */
export function projectSearchItems(items: SearchItem[]): SearchItem[] {
  return items.map((item) => {
    const out: SearchItem = {
      title: item.title,
      url: item.url || item.sourceUrl,
      sourceUrl: item.sourceUrl || item.url,
    };
    for (const key of PROJECTED_KEYS) {
      if (key === 'title' || key === 'url' || key === 'sourceUrl') continue;
      const value = item[key];
      if (value !== undefined && value !== null && value !== '') {
        (out as Record<string, unknown>)[key] = value;
      }
    }
    return out;
  });
}
