import { bucketSampleSearchItems } from './bucket-sample';
import { dedupeSearchItems } from './dedupe';
import { countByKind, sampleByKindMix } from './kind-sample';
import { normalizeSearchRows } from './normalize';
import { projectSearchItems } from './project';
import { rankSearchItems } from './rank';
import type { PreprocessOptions, PreprocessResult, RawSearchRow } from './types';

/**
 * Normalize → Project → Deduplicate → Rank → (kind mix | bucket) sample (Top N).
 * Pure code — no LLM.
 */
export function preprocessSearchItems(
  rawRows: RawSearchRow[],
  options: PreprocessOptions,
): PreprocessResult {
  const maxInputItems = Math.max(0, options.maxInputItems);
  const perBucket = Math.max(1, options.perBucket);

  const normalized = normalizeSearchRows(rawRows);
  const projected = projectSearchItems(normalized);
  const deduped = dedupeSearchItems(projected);
  const ranked = rankSearchItems(deduped, options.query);
  const selected = options.kindMix
    ? sampleByKindMix(ranked, maxInputItems, options.kindMix)
    : bucketSampleSearchItems(ranked, maxInputItems, perBucket);
  const finalItems = projectSearchItems(selected);

  const buckets = [...new Set(finalItems.map((i) => i.bucket).filter(Boolean))] as string[];
  const selectedByKind = countByKind(finalItems);

  return {
    items: finalItems,
    meta: {
      rawCount: rawRows.length,
      afterDedup: deduped.length,
      selectedCount: finalItems.length,
      buckets,
      selectedByKind,
    },
  };
}
