import type { ToolEnrichmentBundle } from './tool-adapter';

export type TrendEvidenceItem = {
  title: string;
  url: string;
  quote: string;
};

/**
 * Ensure each trendFindings.trends[] has notes + evidence[].
 * When the LLM omits evidence (common with Ollama structured output + optional fields),
 * backfill from web-search enrichment results so FE always sees the field.
 */
export function ensureTrendEvidenceFromSearch(
  output: Record<string, unknown>,
  bundle: ToolEnrichmentBundle | null | undefined,
): Record<string, unknown> {
  const findings = output.trendFindings;
  if (!findings || typeof findings !== 'object' || Array.isArray(findings)) {
    return output;
  }

  const trends = (findings as Record<string, unknown>).trends;
  if (!Array.isArray(trends)) {
    return output;
  }

  const searchEvidence = collectSearchEvidence(bundle);

  for (let i = 0; i < trends.length; i++) {
    const trend = trends[i];
    if (!trend || typeof trend !== 'object' || Array.isArray(trend)) {
      continue;
    }
    const row = trend as Record<string, unknown>;
    if (typeof row.notes !== 'string') {
      row.notes = row.notes == null ? '' : String(row.notes);
    }

    const existing = normalizeEvidenceList(row.evidence);
    if (existing.length > 0) {
      row.evidence = existing;
      continue;
    }

    if (searchEvidence.length === 0) {
      row.evidence = [];
      continue;
    }

    const primary = searchEvidence[i % searchEvidence.length]!;
    const secondary = searchEvidence[(i + 1) % searchEvidence.length]!;
    row.evidence =
      searchEvidence.length === 1 || primary.url === secondary.url
        ? [primary]
        : [primary, secondary];
  }

  return output;
}

function collectSearchEvidence(
  bundle: ToolEnrichmentBundle | null | undefined,
): TrendEvidenceItem[] {
  if (!bundle?.tools?.length) {
    return [];
  }

  const items: TrendEvidenceItem[] = [];
  const seen = new Set<string>();

  for (const tool of bundle.tools) {
    if (tool.code !== 'web-search') continue;
    const results = (tool.result as { results?: unknown })?.results;
    if (!Array.isArray(results)) continue;

    for (const raw of results) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const row = raw as Record<string, unknown>;
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const quote =
        typeof row.snippet === 'string'
          ? row.snippet.trim()
          : typeof row.quote === 'string'
            ? row.quote.trim()
            : '';
      if (!url && !title && !quote) continue;
      const dedupeKey = url || `${title}|${quote}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      items.push({
        title: title || url || 'Search result',
        url,
        quote,
      });
    }
  }

  return items;
}

function normalizeEvidenceList(value: unknown): TrendEvidenceItem[] {
  if (!Array.isArray(value)) return [];
  const items: TrendEvidenceItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title : '';
    const url = typeof row.url === 'string' ? row.url : '';
    const quote = typeof row.quote === 'string' ? row.quote : '';
    if (!title && !url && !quote) continue;
    items.push({ title, url, quote });
  }
  return items;
}
