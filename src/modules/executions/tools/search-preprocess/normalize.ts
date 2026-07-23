import type { RawSearchRow, SearchItem } from './types';

/**
 * Normalize SerpAPI / Tavily / DuckDuckGo-style rows into SearchItem[].
 */
export function normalizeSearchRows(rows: RawSearchRow[]): SearchItem[] {
  const items: SearchItem[] = [];
  for (const row of rows) {
    const item = normalizeOne(row);
    if (item) items.push(item);
  }
  return items;
}

/** Extract shopping_results + organic_results from a SerpAPI JSON body. */
export function extractSerpApiRows(data: Record<string, unknown>): RawSearchRow[] {
  const rows: RawSearchRow[] = [];
  const shopping = Array.isArray(data.shopping_results) ? data.shopping_results : [];
  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
  for (const item of shopping) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      rows.push(item as RawSearchRow);
    }
  }
  for (const item of organic) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      rows.push(item as RawSearchRow);
    }
  }
  return rows;
}

function normalizeOne(row: RawSearchRow): SearchItem | null {
  const title = firstString(row.title, row.Heading);
  const sourceUrl = firstString(
    row.link,
    row.product_link,
    row.url,
    row.FirstURL,
    row.AbstractURL,
  );
  if (!title && !sourceUrl) return null;
  if (!sourceUrl) return null;

  const brand = firstString(row.source, row.brand, row.seller);
  const price = firstNumber(row.extracted_price, row.price);
  const rating = firstNumber(row.rating);
  const reviewCount = firstNumber(row.reviews, row.reviewCount);
  const imageUrl = firstString(row.thumbnail, row.imageUrl, row.image);
  const snippet = firstString(
    row.snippet,
    row.content,
    row.AbstractText,
    row.Text,
    row.description,
  );
  const kind = parseKind(row._kind);
  const provider = firstString(row._provider);

  const resolvedTitle = title || sourceUrl;
  return {
    title: resolvedTitle,
    url: sourceUrl,
    sourceUrl,
    ...(brand ? { brand } : {}),
    ...(price != null ? { price } : {}),
    ...(rating != null ? { rating } : {}),
    ...(reviewCount != null ? { reviewCount } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(snippet ? { snippet: snippet.slice(0, 280) } : {}),
    ...(kind ? { kind } : {}),
    ...(provider ? { provider } : {}),
  };
}

function parseKind(value: unknown): SearchItem['kind'] | undefined {
  if (value === 'shopping' || value === 'article' || value === 'other') return value;
  return undefined;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      if (!cleaned) continue;
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}
