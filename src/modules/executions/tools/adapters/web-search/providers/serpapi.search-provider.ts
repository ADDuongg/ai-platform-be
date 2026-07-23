import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AllConfigType } from '@common/config';

import { extractSerpApiRows } from '../../../search-preprocess';
import { fetchWithTimeout, truncateWithMarker } from '../../../tool-http.util';
import { asTrimmedString, firstTrimmedString, marketToGl } from '../web-search.config';
import { persistSearchProviderResponse } from '../persist-serpapi-response';
import type {
  WebSearchProvider,
  WebSearchProviderRequest,
  WebSearchProviderResult,
} from '../web-search.provider';

const DEFAULT_SERPAPI_BASE = 'https://serpapi.com';

@Injectable()
export class SerpApiSearchProvider implements WebSearchProvider {
  readonly id = 'serpapi' as const;
  private readonly logger = new Logger(SerpApiSearchProvider.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  isAvailable(_configJson: Record<string, unknown>): boolean {
    return Boolean(this.apiKey());
  }

  async search(request: WebSearchProviderRequest): Promise<WebSearchProviderResult> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new Error('SERPAPI_API_KEY is not configured');
    }

    const engine = resolveEngine(request.configJson);
    const url = new URL(`${this.baseUrl()}/search.json`);
    url.searchParams.set('engine', engine);
    url.searchParams.set('q', request.query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', String(request.fetchLimit));
    const gl = marketToGl(asTrimmedString(request.input.market));
    if (gl) url.searchParams.set('gl', gl);

    const res = await fetchWithTimeout(
      url.toString(),
      {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'ai-platform-be/1.0 (+local-dev)' },
      },
      request.timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`serpapi HTTP ${res.status}`);
    }

    const rawText = truncateWithMarker(await res.text(), request.maxBytes);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error('serpapi returned non-JSON body');
    }
    if (data.error && typeof data.error === 'string') {
      throw new Error(`serpapi error: ${data.error}`);
    }

    const persistedPath = await this.tryPersist(request, engine, data);
    const rows = extractSerpApiRows(data).slice(0, request.fetchLimit);
    return {
      provider: this.id,
      source: engine === 'google' ? 'serpapi-google' : 'serpapi-google_shopping',
      rows,
      ...(persistedPath ? { persistedPath } : {}),
    };
  }

  private async tryPersist(
    request: WebSearchProviderRequest,
    engine: string,
    data: Record<string, unknown>,
  ): Promise<string | undefined> {
    const storageRoot = request.storageRoot?.trim();
    if (!storageRoot) return undefined;
    try {
      const saved = await persistSearchProviderResponse({
        storageRoot,
        provider: 'serpapi',
        label: engine,
        query: request.query,
        input: request.input,
        response: data,
      });
      this.logger.log(`serpapi response persisted path=${saved.relativePath}`);
      return saved.relativePath;
    } catch (err) {
      this.logger.warn(
        `serpapi persist failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  private apiKey(): string {
    return this.configService.get('toolRuntime', { infer: true })?.serpapi?.apiKey?.trim() ?? '';
  }

  private baseUrl(): string {
    const base =
      this.configService.get('toolRuntime', { infer: true })?.serpapi?.baseUrl ??
      DEFAULT_SERPAPI_BASE;
    return base.replace(/\/$/, '');
  }
}

function resolveEngine(configJson: Record<string, unknown>): 'google_shopping' | 'google' {
  const engine = firstTrimmedString(configJson.engine)?.toLowerCase();
  return engine === 'google' ? 'google' : 'google_shopping';
}
