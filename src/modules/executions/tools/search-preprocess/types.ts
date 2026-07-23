export type SearchItemKind = 'shopping' | 'article' | 'other';

export type SearchItem = {
  title: string;
  /** Alias of sourceUrl for trend-evidence / sanitizer compatibility */
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
  kind?: SearchItemKind;
  provider?: string;
};

export type KindMix = {
  shopping: number;
  article: number;
};

export type PreprocessOptions = {
  query: string;
  maxInputItems: number;
  perBucket: number;
  /** When set, sample shopping/article quotas before keyword buckets. */
  kindMix?: KindMix;
};

export type PreprocessMeta = {
  rawCount: number;
  afterDedup: number;
  selectedCount: number;
  buckets: string[];
  selectedByKind?: Record<string, number>;
};

export type PreprocessResult = {
  items: SearchItem[];
  meta: PreprocessMeta;
};

/** Raw row before normalize (provider-agnostic loose shape). */
export type RawSearchRow = Record<string, unknown>;
