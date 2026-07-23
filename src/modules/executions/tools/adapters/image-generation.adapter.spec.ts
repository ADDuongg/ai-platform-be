import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

import { AllConfigType } from '@common/config';

import { ImageGenerationAdapter } from './image-generation.adapter';
import { ObjectStorageAdapter } from './object-storage.adapter';

function mockConfig(apiKey = 'test-flux-key'): ConfigService<AllConfigType> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'toolRuntime') {
        return {
          mode: 'live',
          storageRoot: '.data/tool-storage',
          resultMaxBytes: 262_144,
          flux: {
            apiKey,
            baseUrl: 'https://api.bfl.ai',
            endpointPath: '/v1/flux-2-pro',
            pollIntervalMs: 10,
          },
        };
      }
      return undefined;
    }),
  } as unknown as ConfigService<AllConfigType>;
}

describe('ImageGenerationAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns stub-live placeholder without calling Flux', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new ImageGenerationAdapter(mockConfig());
    const result = await adapter.invoke({
      code: 'image-generation',
      input: { prompt: 'kids summer dress SS27' },
      configJson: { provider: 'stub-live' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('stub-live');
    expect(String(result.assetUrl)).toMatch(/^data:image\/svg\+xml/);
    expect(String(result.stubUri)).toMatch(/^stub-live:\/\//);
    expect(result.promptEcho).toContain('kids summer');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves prompt from imagePrompt when prompt is absent', async () => {
    const adapter = new ImageGenerationAdapter(mockConfig());
    const result = await adapter.invoke({
      code: 'image-generation',
      input: { imagePrompt: 'portrait kids hoodie soft light' },
      configJson: { provider: 'stub-live' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });
    expect(result.promptEcho).toBe('portrait kids hoodie soft light');
  });

  it('calls Flux submit+poll and returns sample URL', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'gen_abc',
          polling_url: 'https://api.bfl.ai/v1/get_result?id=gen_abc',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'Pending' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'Ready',
          result: {
            sample: 'https://cdn.example.com/result.png',
            seed: 42,
          },
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new ImageGenerationAdapter(mockConfig('bfl_test_key'));
    const result = await adapter.invoke({
      code: 'image-generation',
      input: { prompt: 'kids summer dress on white background', width: 1024, height: 1024 },
      configJson: { provider: 'flux' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: '.data/tool-storage',
    });

    expect(result.provider).toBe('flux');
    expect(result.assetUrl).toBe('https://cdn.example.com/result.png');
    expect(result.requestId).toBe('gen_abc');
    expect(result.seed).toBe(42);
    expect(result.promptEcho).toContain('kids summer');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [submitUrl, submitInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(submitUrl).toBe('https://api.bfl.ai/v1/flux-2-pro');
    expect(submitInit.method).toBe('POST');
    expect((submitInit.headers as Record<string, string>)['x-key']).toBe('bfl_test_key');
    expect(JSON.parse(String(submitInit.body))).toEqual({
      prompt: 'kids summer dress on white background',
      width: 1024,
      height: 1024,
    });
  });

  it('throws when Flux API key is missing', async () => {
    const adapter = new ImageGenerationAdapter(mockConfig(''));
    await expect(
      adapter.invoke({
        code: 'image-generation',
        input: { prompt: 'test' },
        configJson: { provider: 'flux' },
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/FLUX_API_KEY/);
  });

  it('throws when Flux poll returns Failed', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'gen_fail',
          polling_url: 'https://api.bfl.ai/v1/get_result?id=gen_fail',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'Failed', error: 'moderation blocked' }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new ImageGenerationAdapter(mockConfig('key'));
    await expect(
      adapter.invoke({
        code: 'image-generation',
        input: { prompt: 'blocked prompt' },
        configJson: { provider: 'flux' },
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot: '.data/tool-storage',
      }),
    ).rejects.toThrow(/Failed.*moderation blocked/);
  });
});

describe('ObjectStorageAdapter', () => {
  const adapter = new ObjectStorageAdapter();
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'tool-storage-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('puts and gets objects under storage root', async () => {
    const put = await adapter.invoke({
      code: 'object-storage',
      input: {
        operation: 'put',
        key: 'designs/a.json',
        executionId: 'exec-1',
        text: '{"ok":true}',
        contentType: 'application/json',
      },
      configJson: { provider: 'filesystem' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: root,
    });

    expect(put.provider).toBe('filesystem');
    expect(put.operation).toBe('put');
    expect(put.bytes).toBeGreaterThan(0);

    const got = await adapter.invoke({
      code: 'object-storage',
      input: {
        operation: 'get',
        key: 'designs/a.json',
        executionId: 'exec-1',
      },
      configJson: { provider: 'filesystem' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: root,
    });

    expect(got.operation).toBe('get');
    expect(Buffer.from(String(got.contentBase64), 'base64').toString('utf8')).toBe('{"ok":true}');
  });

  it('sanitizes .. segments so writes stay under root', async () => {
    const put = await adapter.invoke({
      code: 'object-storage',
      input: {
        operation: 'put',
        key: '../outside.txt',
        executionId: 'exec-1',
        text: 'safe',
      },
      configJson: {},
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot: root,
    });

    expect(String(put.path)).toContain(root);
    expect(String(put.path)).not.toContain(`${path.sep}..${path.sep}`);
    expect(put.key).toBe('outside.txt');
  });
});
