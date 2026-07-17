import { mkdtemp, rm, readFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ObjectStorageAdapter } from './object-storage.adapter';

describe('ObjectStorageAdapter', () => {
  const adapter = new ObjectStorageAdapter();
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(os.tmpdir(), 'tool-storage-'));
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('puts step enrichment payload when no key/content (organizer path)', async () => {
    const result = await adapter.invoke({
      code: 'object-storage',
      input: {
        market: 'VN',
        season: 'SS27',
        rawGenerations: { assetUrl: 'stub-live://image-generation/x.png' },
      },
      configJson: { provider: 'filesystem' },
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot,
    });

    expect(result.operation).toBe('put');
    expect(result.provider).toBe('filesystem');
    expect(String(result.key)).toMatch(/^auto\//);
    expect(Number(result.bytes)).toBeGreaterThan(2);

    const abs = String(result.path);
    const written = JSON.parse(await readFile(abs, 'utf8')) as Record<string, unknown>;
    expect(written.market).toBe('VN');
    expect(written.rawGenerations).toMatchObject({
      assetUrl: 'stub-live://image-generation/x.png',
    });
  });

  it('gets an object by key after put', async () => {
    await adapter.invoke({
      code: 'object-storage',
      input: { key: 'meta/board.json', text: '{"ok":true}', executionId: 'exec-1' },
      configJson: {},
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot,
    });

    const got = await adapter.invoke({
      code: 'object-storage',
      input: { key: 'meta/board.json', executionId: 'exec-1' },
      configJson: {},
      timeoutMs: 5_000,
      maxBytes: 262_144,
      storageRoot,
    });

    expect(got.operation).toBe('get');
    expect(Buffer.from(String(got.contentBase64), 'base64').toString('utf8')).toBe('{"ok":true}');
  });

  it('throws when get targets a missing explicit key', async () => {
    await expect(
      adapter.invoke({
        code: 'object-storage',
        input: { key: 'missing/nope.json', executionId: 'exec-1' },
        configJson: {},
        timeoutMs: 5_000,
        maxBytes: 262_144,
        storageRoot,
      }),
    ).rejects.toThrow(/object not found/);
  });
});
