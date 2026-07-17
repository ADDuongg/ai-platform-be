import {
  collectAllowedUrlsFromEnrichment,
  normalizeUrl,
  pickFirstHttpUrl,
  sanitizeReferencesAgainstAllowlist,
} from './reference-url.sanitizer';

describe('reference-url.sanitizer', () => {
  it('collects urls from web-search enrichment', () => {
    const allowed = collectAllowedUrlsFromEnrichment({
      tools: [
        {
          code: 'web-search',
          result: {
            results: [
              { title: 'A', url: 'https://example.com/a/' },
              { title: 'B', url: 'https://example.com/b' },
            ],
          },
        },
      ],
    });
    expect(allowed.has(normalizeUrl('https://example.com/a')!)).toBe(true);
    expect(allowed.has(normalizeUrl('https://example.com/b')!)).toBe(true);
  });

  it('picks first http url from nested search results', () => {
    expect(
      pickFirstHttpUrl({
        results: [
          { title: 'A', url: 'https://example.com/a' },
          { title: 'B', url: 'https://example.com/b' },
        ],
      }),
    ).toBe(normalizeUrl('https://example.com/a'));
  });

  it('drops hallucinated references when allowlist is set', () => {
    const allowed = new Set([normalizeUrl('https://example.com/real')!]);
    const out = sanitizeReferencesAgainstAllowlist(
      {
        researchReport: {
          summary: 'x',
          trends: [],
          references: [
            { title: 'Real', url: 'https://example.com/real' },
            { title: 'Fake', url: 'https://totally-fake.example/404' },
          ],
          gaps: [],
        },
      },
      allowed,
    );
    const refs = (out.researchReport as { references: unknown[] }).references;
    expect(refs).toHaveLength(1);
    expect((refs[0] as { url: string }).url).toContain('example.com/real');
  });

  it('clears all references when allowlist empty and annotates gaps', () => {
    const out = sanitizeReferencesAgainstAllowlist(
      {
        researchReport: {
          summary: 'x',
          trends: [],
          references: [{ title: 'Fake', url: 'https://fake.example' }],
          gaps: [],
        },
      },
      new Set(),
    );
    const report = out.researchReport as { references: unknown[]; gaps: string[] };
    expect(report.references).toEqual([]);
    expect(report.gaps.some((g) => g.includes('verified web sources'))).toBe(true);
  });
});
