import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

import { ImageGenerationAdapter } from './image-generation.adapter';
import { ObjectStorageAdapter } from './object-storage.adapter';

describe('ImageGenerationAdapter', () => {
  const adapter = new ImageGenerationAdapter();

  it('returns stub-live placeholder without calling Flux', async () => {
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
