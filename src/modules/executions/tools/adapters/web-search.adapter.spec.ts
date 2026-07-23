import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

import type { AllConfigType } from '@common/config';

import { WebSearchAdapter } from './web-search.adapter';
import {
  DuckDuckGoSearchProvider,
  GeminiSearchProvider,
  GoogleCseSearchProvider,
  SerpApiSearchProvider,
  TavilySearchProvider,
  WebSearchProviderRegistry,
} from './web-search';

function mockConfig(serpapiKey = '', tavilyKey = ''): ConfigService<AllConfigType> {
  return {
    get: (key: string) => {
      if (key === 'toolRuntime') {
        return {
          mode: 'live',
          storageRoot: '.data/tool-storage',
          resultMaxBytes: 262_144,
          flux: { apiKey: '', baseUrl: '', endpointPath: '', pollIntervalMs: 500 },
          serpapi: { apiKey: serpapiKey, baseUrl: 'https://serpapi.com' },
          tavily: { apiKey: tavilyKey, baseUrl: 'https://api.tavily.com' },
        };
      }
      return undefined;
    },
  } as unknown as ConfigService<AllConfigType>;
}

function createAdapter(serpapiKey = '', tavilyKey = ''): WebSearchAdapter {
  const config = mockConfig(serpapiKey, tavilyKey);
  const registry = new WebSearchProviderRegistry([
    new SerpApiSearchProvider(config),
    new TavilySearchProvider(config),
    new DuckDuckGoSearchProvider(),
    new GoogleCseSearchProvider(),
    new GeminiSearchProvider(),
  ]);
  return new WebSearchAdapter(registry);
}

describe('WebSearchAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps DuckDuckGo Instant Answer JSON to results when provider forced', async () => {
    const adapter = createAdapter('');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          Heading: 'Kids fashion',
          AbstractText: 'Trends in kids apparel',
          AbstractURL: 'https://example.com/kids',
          RelatedTopics: [
            { Text: 'Color blocking', FirstURL: 'https://example.com/a' },
            { Text: 'Sustainable cotton', FirstURL: 'https://example.com/b' },
          ],
        }),
    });

    const result = await adapter.invoke({
      code: 'web-search',
      input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      configJson: {
        provider: 'duckduckgo',
        maxResults: 5,
        queryTemplates: ['kids fashion trends {{season}} {{category}} {{market}}'],
      },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('duckduckgo');
    expect(String(result.query).toLowerCase()).toContain('kids fashion');
    expect(Array.isArray(result.results)).toBe(true);
    expect((result.results as unknown[]).length).toBeGreaterThan(0);
    expect(result.meta).toMatchObject({
      selectedCount: expect.any(Number),
      fallbackUsed: false,
    });
  });

  it('falls back to HTML when Instant Answer is empty', async () => {
    const adapter = createAdapter('');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ Heading: '', RelatedTopics: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `<html><a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent('https://example.com/html-hit')}">Hit</a></html>`,
      });

    const result = await adapter.invoke({
      code: 'web-search',
      input: { query: 'kids fashion Vietnam' },
      configJson: { provider: 'duckduckgo', maxResults: 5 },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.source).toBe('duckduckgo-html');
    expect(result.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: 'https://example.com/html-hit' })]),
    );
  });

  it('uses SerpAPI when API key is set and returns Top N', async () => {
    const adapter = createAdapter('test-serp-key');
    const shopping = Array.from({ length: 30 }, (_, i) => ({
      title: `Pastel kids tee ${i}`,
      link: `https://shop.example/p/${i}`,
      source: 'Zara',
      extracted_price: 10 + i,
      rating: 4.5,
      reviews: 100 + i,
      thumbnail: `https://img.example/${i}.jpg`,
      delivery: 'Free',
      extensions: ['x'],
    }));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ shopping_results: shopping }),
    });

    const storageRoot = await mkdtemp(path.join(tmpdir(), 'web-search-serp-'));
    try {
      const result = await adapter.invoke({
        code: 'web-search',
        input: { query: 'pastel kids tee', season: 'SS27', market: 'VN' },
        configJson: {
          provider: 'serpapi',
          engine: 'google_shopping',
          fetchLimit: 50,
          maxInputItems: 8,
          perBucket: 4,
        },
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot,
      });

      expect(result.provider).toBe('serpapi');
      expect(result.source).toBe('serpapi-google_shopping');
      expect((result.results as unknown[]).length).toBeLessThanOrEqual(8);
      expect(result.meta).toMatchObject({
        rawCount: 30,
        selectedCount: (result.results as unknown[]).length,
        fallbackUsed: false,
        persistedPath: expect.stringMatching(/^web-search\/\d{4}-\d{2}-\d{2}\//),
      });
      const first = (result.results as Record<string, unknown>[])[0];
      expect(first).toHaveProperty('url');
      expect(first).not.toHaveProperty('delivery');
      expect(first).not.toHaveProperty('extensions');

      const calledUrl = String((global.fetch as jest.Mock).mock.calls[0][0]);
      expect(calledUrl).toContain('serpapi.com');
      expect(calledUrl).toContain('engine=google_shopping');
      expect(calledUrl).toContain('api_key=');

      const persistedAbs = path.join(
        storageRoot,
        String((result.meta as { persistedPath: string }).persistedPath),
      );
      const disk = JSON.parse(await readFile(persistedAbs, 'utf8')) as Record<string, unknown>;
      expect(disk.query).toBe('pastel kids tee');
      expect(disk.response).toMatchObject({ shopping_results: expect.any(Array) });
    } finally {
      await rm(storageRoot, { recursive: true, force: true });
    }
  });

  it('hybrid merges SerpAPI shopping + Tavily articles with kind mix', async () => {
    const adapter = createAdapter('serp-key', 'tvly-key');
    global.fetch = jest.fn().mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('serpapi.com')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              shopping_results: [
                {
                  title: 'Pastel Kids Tee',
                  link: 'https://shop.zara.com/pastel-tee',
                  source: 'Zara',
                  extracted_price: 12,
                  rating: 4.8,
                  reviews: 200,
                },
                {
                  title: 'Ocean Kids Shirt',
                  link: 'https://uniqlo.com/ocean',
                  source: 'Uniqlo',
                  extracted_price: 15,
                  rating: 4.5,
                  reviews: 90,
                },
              ],
            }),
        };
      }
      if (url.includes('api.tavily.com')) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              results: [
                {
                  title: 'SS27 kids pastel and ocean trends',
                  url: 'https://vogue.com/ss27-kids',
                  content: 'Pastel tees and ocean prints lead kids fashion SS27.',
                  score: 0.9,
                },
                {
                  title: 'Denim jackets for children',
                  url: 'https://www.example.com/denim',
                  content: 'Soft denim remains a staple.',
                  score: 0.7,
                },
              ],
            }),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const storageRoot = await mkdtemp(path.join(tmpdir(), 'web-search-hybrid-'));
    try {
      const result = await adapter.invoke({
        code: 'web-search',
        input: { query: 'kids fashion pastel ocean SS27' },
        configJson: {
          providers: ['serpapi', 'tavily'],
          engine: 'google_shopping',
          searchDepth: 'basic',
          fetchLimit: 10,
          maxInputItems: 4,
          kindMix: { shopping: 2, article: 2 },
        },
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot,
      });

      expect(result.provider).toBe('hybrid');
      expect(result.providersUsed).toEqual(expect.arrayContaining(['serpapi', 'tavily']));
      expect((result.results as unknown[]).length).toBe(4);
      expect(result.meta).toMatchObject({
        fallbackUsed: false,
        selectedByKind: expect.objectContaining({
          shopping: 2,
          article: 2,
        }),
        persistedPaths: expect.arrayContaining([
          expect.stringMatching(/serpapi/),
          expect.stringMatching(/tavily/),
        ]),
      });
      const kinds = (result.results as Array<{ kind?: string }>).map((r) => r.kind);
      expect(kinds.filter((k) => k === 'shopping')).toHaveLength(2);
      expect(kinds.filter((k) => k === 'article')).toHaveLength(2);
    } finally {
      await rm(storageRoot, { recursive: true, force: true });
    }
  });

  it('falls back to DuckDuckGo when SerpAPI fails', async () => {
    const adapter = createAdapter('test-serp-key');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'error',
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            Heading: 'Fallback',
            AbstractText: 'From DDG',
            AbstractURL: 'https://example.com/ddg',
            RelatedTopics: [],
          }),
      });

    const result = await adapter.invoke({
      code: 'web-search',
      input: { query: 'kids fashion' },
      configJson: { provider: 'serpapi', maxInputItems: 5 },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('duckduckgo');
    expect(result.meta).toMatchObject({ fallbackUsed: true });
    expect(result.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: 'https://example.com/ddg' })]),
    );
  });

  it('uses DuckDuckGo when SerpAPI key is missing (no fallback flag)', async () => {
    const adapter = createAdapter('');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          Heading: 'Kids',
          AbstractText: 'No key path',
          AbstractURL: 'https://example.com/nokey',
          RelatedTopics: [],
        }),
    });

    const result = await adapter.invoke({
      code: 'web-search',
      input: { query: 'kids fashion' },
      configJson: { provider: 'serpapi', maxInputItems: 5 },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('duckduckgo');
    expect(result.meta).toMatchObject({ fallbackUsed: false });
  });

  it('throws when no query can be built', async () => {
    const adapter = createAdapter('');
    await expect(
      adapter.invoke({
        code: 'web-search',
        input: {},
        configJson: { provider: 'duckduckgo' },
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/query/i);
  });
});
