import { WebBrowserAdapter } from './web-browser.adapter';

describe('WebBrowserAdapter', () => {
  const adapter = new WebBrowserAdapter();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('extracts text from HTML and truncates oversize', async () => {
    const huge = `<html><body>${'x'.repeat(300_000)}</body></html>`;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html' },
      text: async () => huge,
    });

    const result = await adapter.invoke({
      code: 'web-browser',
      input: { url: 'https://example.com/page' },
      configJson: { provider: 'native-fetch' },
      timeoutMs: 5_000,
      maxBytes: 1024,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('native-fetch');
    expect(result.truncated).toBe(true);
    expect(String(result.text)).toContain('[truncated]');
    expect(Buffer.from(String(result.text), 'utf8').byteLength).toBeLessThanOrEqual(1024);
  });

  it('rejects non-http URLs', async () => {
    await expect(
      adapter.invoke({
        code: 'web-browser',
        input: { url: 'file:///etc/passwd' },
        configJson: {},
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/http\(s\)/);
  });

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => 'text/html' },
      text: async () => 'missing',
    });

    await expect(
      adapter.invoke({
        code: 'web-browser',
        input: { url: 'https://example.com/missing' },
        configJson: {},
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/HTTP 404/);
  });
});
