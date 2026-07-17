import { WebSearchAdapter } from './web-search.adapter';

describe('WebSearchAdapter', () => {
  const adapter = new WebSearchAdapter();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps DuckDuckGo Instant Answer JSON to results', async () => {
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
      configJson: { provider: 'duckduckgo', maxResults: 5 },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('duckduckgo');
    expect(String(result.query).toLowerCase()).toContain('kids fashion');
    expect(Array.isArray(result.results)).toBe(true);
    expect((result.results as unknown[]).length).toBeGreaterThan(0);
  });

  it('falls back to HTML when Instant Answer is empty', async () => {
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
      configJson: { maxResults: 5 },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.source).toBe('duckduckgo-html');
    expect(result.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: 'https://example.com/html-hit' })]),
    );
  });

  it('throws on Instant Answer HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '',
    });

    await expect(
      adapter.invoke({
        code: 'web-search',
        input: { query: 'kids fashion' },
        configJson: {},
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/HTTP 503/);
  });

  it('throws when query cannot be built', async () => {
    await expect(
      adapter.invoke({
        code: 'web-search',
        input: {},
        configJson: {},
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/requires input.query/);
  });
});
