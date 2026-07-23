import type { SearchItem } from './types';

/**
 * Deduplicate by normalized URL, then near-duplicate titles (token overlap).
 */
export function dedupeSearchItems(items: SearchItem[]): SearchItem[] {
  const byUrl = new Map<string, SearchItem>();
  for (const item of items) {
    const key = normalizeUrlKey(item.sourceUrl || item.url);
    if (!key) continue;
    const existing = byUrl.get(key);
    if (!existing) {
      byUrl.set(key, item);
      continue;
    }
    byUrl.set(key, preferRicher(existing, item));
  }

  const urlDeduped = [...byUrl.values()];
  const kept: SearchItem[] = [];
  for (const item of urlDeduped) {
    const dup = kept.find((other) => titlesNearDuplicate(other.title, item.title));
    if (dup) {
      const idx = kept.indexOf(dup);
      kept[idx] = preferRicher(dup, item);
      continue;
    }
    kept.push(item);
  }
  return kept;
}

export function normalizeUrlKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    let path = u.pathname.replace(/\/+$/, '') || '/';
    // Drop common tracking query; keep path only for shopping deep links
    return `${host}${path}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase().split('?')[0] ?? '';
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(t[\s-]?shirt|tee)\b/g, 'tee')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(title: string): Set<string> {
  return new Set(normalizeTitle(title).split(' ').filter((t) => t.length > 1));
}

export function titlesNearDuplicate(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  const union = new Set([...ta, ...tb]).size;
  const jaccard = overlap / union;
  return jaccard >= 0.85 || (overlap >= Math.min(ta.size, tb.size) && jaccard >= 0.7);
}

function preferRicher(a: SearchItem, b: SearchItem): SearchItem {
  const score = (item: SearchItem) =>
    (item.rating != null ? 2 : 0) +
    (item.reviewCount != null ? 2 : 0) +
    (item.price != null ? 1 : 0) +
    (item.brand ? 1 : 0) +
    (item.snippet ? 1 : 0) +
    (item.imageUrl ? 1 : 0);
  return score(b) > score(a) ? b : a;
}
