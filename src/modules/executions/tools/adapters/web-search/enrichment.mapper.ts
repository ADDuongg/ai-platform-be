import type { SearchItem } from '../../search-preprocess';

export function toEnrichmentResult(item: SearchItem): Record<string, unknown> {
  return {
    title: item.title,
    url: item.url || item.sourceUrl,
    sourceUrl: item.sourceUrl || item.url,
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.price != null ? { price: item.price } : {}),
    ...(item.rating != null ? { rating: item.rating } : {}),
    ...(item.reviewCount != null ? { reviewCount: item.reviewCount } : {}),
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.snippet ? { snippet: item.snippet } : {}),
    ...(item.bucket ? { bucket: item.bucket } : {}),
    ...(item.score != null ? { score: item.score } : {}),
    ...(item.kind ? { kind: item.kind } : {}),
    ...(item.provider ? { provider: item.provider } : {}),
  };
}
