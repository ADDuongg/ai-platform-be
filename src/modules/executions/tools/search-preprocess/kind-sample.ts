import type { KindMix, SearchItem, SearchItemKind } from './types';

/**
 * Take top-ranked items per kind quota, then fill remaining slots up to maxInputItems.
 */
export function sampleByKindMix(
  ranked: SearchItem[],
  maxInputItems: number,
  kindMix: KindMix,
): SearchItem[] {
  if (maxInputItems <= 0) return [];

  const shoppingCap = Math.max(0, kindMix.shopping);
  const articleCap = Math.max(0, kindMix.article);
  const selected: SearchItem[] = [];
  const selectedUrls = new Set<string>();

  const takeFrom = (kind: SearchItemKind, cap: number) => {
    let taken = 0;
    for (const item of ranked) {
      if (selected.length >= maxInputItems || taken >= cap) break;
      const itemKind = item.kind ?? 'other';
      if (itemKind !== kind) continue;
      const urlKey = item.sourceUrl || item.url;
      if (selectedUrls.has(urlKey)) continue;
      selected.push(item);
      selectedUrls.add(urlKey);
      taken += 1;
    }
  };

  takeFrom('shopping', shoppingCap);
  takeFrom('article', articleCap);

  if (selected.length < maxInputItems) {
    for (const item of ranked) {
      if (selected.length >= maxInputItems) break;
      const urlKey = item.sourceUrl || item.url;
      if (selectedUrls.has(urlKey)) continue;
      selected.push(item);
      selectedUrls.add(urlKey);
    }
  }

  return selected.slice(0, maxInputItems);
}

export function countByKind(items: SearchItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = item.kind ?? 'other';
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
