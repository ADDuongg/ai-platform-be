import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

import {
  buildSerpApiPersistRelativePath,
  persistSerpApiResponse,
} from './persist-serpapi-response';

describe('persistSerpApiResponse', () => {
  it('builds date-partitioned lookup-friendly paths', () => {
    const relative = buildSerpApiPersistRelativePath({
      savedAt: new Date('2026-07-23T07:25:30.123Z'),
      engine: 'google_shopping',
      query: 'kids fashion trends SS27 kids-apparel VN',
    });
    expect(relative).toMatch(
      /^web-search\/2026-07-23\/072530Z__serpapi__google-shopping__kids-fashion-trends-ss27-kids-apparel-vn__[a-f0-9]{8}\.json$/,
    );
  });

  it('writes envelope JSON without api_key under storageRoot/web-search', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'serp-persist-'));
    try {
      const saved = await persistSerpApiResponse({
        storageRoot: root,
        engine: 'google_shopping',
        query: 'pastel kids tee',
        input: { season: 'SS27', market: 'VN', secret: 'should-not-copy' },
        response: {
          shopping_results: [{ title: 'Tee', link: 'https://example.com/t' }],
        },
      });

      expect(saved.relativePath.startsWith('web-search/')).toBe(true);
      const raw = await readFile(saved.absolutePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        provider: 'serpapi',
        label: 'google_shopping',
        query: 'pastel kids tee',
        input: { season: 'SS27', market: 'VN' },
      });
      expect(parsed.input).not.toHaveProperty('secret');
      expect(JSON.stringify(parsed)).not.toContain('api_key');
      expect(parsed.response).toEqual({
        shopping_results: [{ title: 'Tee', link: 'https://example.com/t' }],
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
