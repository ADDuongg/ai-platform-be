import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AllConfigType } from '@common/config';

import type { RawSearchRow } from '../../../search-preprocess';
import { fetchWithTimeout, truncateWithMarker } from '../../../tool-http.util';
import { firstTrimmedString } from '../web-search.config';
import { persistSearchProviderResponse } from '../persist-serpapi-response';
import type {
  WebSearchProvider,
  WebSearchProviderRequest,
  WebSearchProviderResult,
} from '../web-search.provider';

const DEFAULT_TAVILY_BASE = 'https://api.tavily.com';

@Injectable()
export class TavilySearchProvider implements WebSearchProvider {
  readonly id = 'tavily' as const;
  private readonly logger = new Logger(TavilySearchProvider.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  isAvailable(_configJson: Record<string, unknown>): boolean {
    return Boolean(this.apiKey());
  }

  async search(request: WebSearchProviderRequest): Promise<WebSearchProviderResult> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    const searchDepth = resolveSearchDepth(request.configJson);
    const maxResults = Math.min(Math.max(1, request.fetchLimit), 20);
    const url = `${this.baseUrl()}/search`;

    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'ai-platform-be/1.0 (+local-dev)',
        },
        body: JSON.stringify({
          query: request.query,
          search_depth: searchDepth,
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
        }),
      },
      request.timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`tavily HTTP ${res.status}`);
    }

    const rawText = truncateWithMarker(await res.text(), request.maxBytes);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error('tavily returned non-JSON body');
    }
    if (data.error && typeof data.error === 'string') {
      throw new Error(`tavily error: ${data.error}`);
    }
    if (data.detail && typeof data.detail === 'string') {
      throw new Error(`tavily error: ${data.detail}`);
    }

    const persistedPath = await this.tryPersist(request, searchDepth, data);
    const rows = extractTavilyRows(data).slice(0, maxResults);
    return {
      provider: this.id,
      source: `tavily-${searchDepth}`,
      rows,
      ...(persistedPath ? { persistedPath } : {}),
    };
  }

  private async tryPersist(
    request: WebSearchProviderRequest,
    searchDepth: string,
    data: Record<string, unknown>,
  ): Promise<string | undefined> {
    const storageRoot = request.storageRoot?.trim();
    if (!storageRoot) return undefined;
    try {
      const saved = await persistSearchProviderResponse({
        storageRoot,
        provider: 'tavily',
        label: searchDepth,
        query: request.query,
        input: request.input,
        response: data,
      });
      this.logger.log(`tavily response persisted path=${saved.relativePath}`);
      return saved.relativePath;
    } catch (err) {
      this.logger.warn(
        `tavily persist failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  private apiKey(): string {
    return this.configService.get('toolRuntime', { infer: true })?.tavily?.apiKey?.trim() ?? '';
  }

  private baseUrl(): string {
    const base =
      this.configService.get('toolRuntime', { infer: true })?.tavily?.baseUrl ?? DEFAULT_TAVILY_BASE;
    return base.replace(/\/$/, '');
  }
}

export function extractTavilyRows(data: Record<string, unknown>): RawSearchRow[] {
  const results = Array.isArray(data.results) ? data.results : [];
  const rows: RawSearchRow[] = [];
  for (const item of results) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      rows.push(item as RawSearchRow);
    }
  }
  return rows;
}

function resolveSearchDepth(configJson: Record<string, unknown>): string {
  const fromNested =
    configJson.tavily && typeof configJson.tavily === 'object' && !Array.isArray(configJson.tavily)
      ? firstTrimmedString((configJson.tavily as Record<string, unknown>).searchDepth)
      : undefined;
  const depth = (fromNested ?? firstTrimmedString(configJson.searchDepth) ?? 'basic').toLowerCase();
  if (depth === 'advanced' || depth === 'fast' || depth === 'ultra-fast') return depth;
  return 'basic';
}
