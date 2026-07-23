import { Inject, Injectable, Logger } from '@nestjs/common';

import { preprocessSearchItems, type RawSearchRow } from '../search-preprocess';
import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';
import { truncateWithMarker } from '../tool-http.util';
import { toEnrichmentResult } from './web-search/enrichment.mapper';
import { buildSearchQueries } from './web-search/query-builder';
import {
  resolveFallbackProvider,
  resolveFetchLimit,
  resolveKindMix,
  resolveMaxInputItems,
  resolvePerBucket,
  resolveProviders,
  WEB_SEARCH_PROVIDER_REGISTRY,
  type WebSearchProvider,
  type WebSearchProviderId,
  type WebSearchProviderRegistry,
  type WebSearchProviderResult,
} from './web-search';

type ProviderHit = WebSearchProviderResult & { query: string };

/**
 * Orchestrates pluggable search providers + preprocess pipeline.
 * Hybrid: fan-out `providers[]` (e.g. serpapi + tavily) → merge rows → preprocess.
 * Fallback only when merged rows are empty.
 */
@Injectable()
export class WebSearchAdapter implements ToolAdapter {
  readonly code = 'web-search';
  private readonly logger = new Logger(WebSearchAdapter.name);

  constructor(
    @Inject(WEB_SEARCH_PROVIDER_REGISTRY)
    private readonly providers: WebSearchProviderRegistry,
  ) {}

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const queries = buildSearchQueries(params.input, params.configJson);
    const fetchLimit = resolveFetchLimit(params.configJson);
    const maxInputItems = resolveMaxInputItems(params.configJson);
    const perBucket = resolvePerBucket(params.configJson);
    const providerIds = resolveProviders(params.configJson);
    const fallbackId = resolveFallbackProvider(params.configJson, providerIds);

    const { hits, primaryAttempted } = await this.fanOutProviders(
      providerIds,
      queries,
      params,
      fetchLimit,
    );
    let fallbackUsed = false;

    if (hits.length === 0 && fallbackId) {
      const fallbackProvider = this.resolveAvailable(fallbackId, params.configJson);
      if (fallbackProvider) {
        const hit = await this.tryQueries(fallbackProvider, queries, params, fetchLimit);
        if (hit) {
          hits.push(hit);
          fallbackUsed = primaryAttempted;
        }
      }
    }

    const activeQuery = hits[0]?.query ?? queries[0] ?? '';
    const taggedRows = hits.flatMap((hit) => tagRows(hit));
    const hybridConfigured = providerIds.length > 1;
    const kindMix = resolveKindMix(
      params.configJson,
      maxInputItems,
      hybridConfigured && taggedRows.length > 0,
    );

    const { items, meta } = preprocessSearchItems(taggedRows, {
      query: activeQuery,
      maxInputItems,
      perBucket,
      ...(kindMix ? { kindMix } : {}),
    });

    const providersUsed = [...new Set(hits.map((h) => h.provider))];
    const sources = [...new Set(hits.map((h) => h.source))];
    const persistedPaths = hits
      .map((h) => h.persistedPath)
      .filter((p): p is string => Boolean(p));
    const rawCountByProvider: Record<string, number> = {};
    for (const hit of hits) {
      rawCountByProvider[hit.provider] = (rawCountByProvider[hit.provider] ?? 0) + hit.rows.length;
    }

    const payload = {
      provider: providersUsed.length > 1 ? 'hybrid' : (providersUsed[0] ?? providerIds[0] ?? 'serpapi'),
      providersUsed,
      source: sources.join('+') || 'empty',
      query: activeQuery,
      queriesTried: queries,
      results: items.map(toEnrichmentResult),
      meta: {
        ...meta,
        fallbackUsed,
        rawCountByProvider,
        ...(persistedPaths.length === 1 ? { persistedPath: persistedPaths[0] } : {}),
        ...(persistedPaths.length > 1 ? { persistedPaths } : {}),
      },
    };
    const serialized = truncateWithMarker(JSON.stringify(payload), params.maxBytes);
    return JSON.parse(serialized) as Record<string, unknown>;
  }

  private async fanOutProviders(
    providerIds: WebSearchProviderId[],
    queries: string[],
    params: ToolAdapterInvokeInput,
    fetchLimit: number,
  ): Promise<{ hits: ProviderHit[]; primaryAttempted: boolean }> {
    const available = providerIds
      .map((id) => this.resolveAvailable(id, params.configJson))
      .filter((p): p is WebSearchProvider => Boolean(p));

    if (available.length === 0) {
      this.logger.warn(
        `web-search no available providers among [${providerIds.join(', ')}]`,
      );
      return { hits: [], primaryAttempted: false };
    }

    const settled = await Promise.all(
      available.map(async (provider) => {
        const hit = await this.tryQueries(provider, queries, params, fetchLimit);
        return hit;
      }),
    );
    return {
      hits: settled.filter((hit): hit is ProviderHit => Boolean(hit)),
      primaryAttempted: true,
    };
  }

  private resolveAvailable(
    id: WebSearchProviderId,
    configJson: Record<string, unknown>,
  ): WebSearchProvider | null {
    const provider = this.providers.tryGet(id);
    if (!provider) {
      this.logger.warn(`web-search provider not registered: ${id}`);
      return null;
    }
    if (!provider.isAvailable(configJson)) {
      return null;
    }
    return provider;
  }

  private async tryQueries(
    provider: WebSearchProvider,
    queries: string[],
    params: ToolAdapterInvokeInput,
    fetchLimit: number,
  ): Promise<ProviderHit | null> {
    for (const query of queries) {
      try {
        const result = await provider.search({
          query,
          fetchLimit,
          timeoutMs: params.timeoutMs,
          maxBytes: params.maxBytes,
          input: params.input,
          configJson: params.configJson,
          storageRoot: params.storageRoot,
        });
        if (result.rows.length > 0) {
          return { ...result, query };
        }
        this.logger.warn(`web-search provider=${provider.id} empty for query=${query}`);
      } catch (err) {
        this.logger.warn(
          `web-search provider=${provider.id} failed for query=${query}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return null;
  }
}

function tagRows(hit: ProviderHit): RawSearchRow[] {
  const kind = inferKind(hit);
  return hit.rows.map((row) => ({
    ...row,
    _provider: hit.provider,
    _source: hit.source,
    _kind: kind,
  }));
}

function inferKind(hit: ProviderHit): 'shopping' | 'article' | 'other' {
  if (hit.source.includes('shopping')) return 'shopping';
  if (hit.provider === 'serpapi') return 'article';
  if (hit.provider === 'tavily') return 'article';
  if (hit.provider === 'duckduckgo') return 'article';
  return 'other';
}
