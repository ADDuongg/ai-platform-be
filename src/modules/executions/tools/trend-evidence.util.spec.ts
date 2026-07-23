import { ensureTrendEvidenceFromSearch } from './trend-evidence.util';

describe('ensureTrendEvidenceFromSearch', () => {
  it('backfills empty evidence from web-search results', () => {
    const out = ensureTrendEvidenceFromSearch(
      {
        trendFindings: {
          summary: 'x',
          trends: [
            { name: 'Bold prints', confidence: 0.55 },
            { name: 'Pastels', confidence: 0.5, notes: 'soft palette' },
          ],
        },
      },
      {
        tools: [
          {
            code: 'web-search',
            result: {
              results: [
                {
                  title: 'Kids SS27',
                  url: 'https://example.com/a',
                  snippet: 'bright prints for kids tees',
                },
                {
                  title: 'EU kidswear',
                  url: 'https://example.com/b',
                  snippet: 'pastel palette',
                },
              ],
            },
          },
        ],
      },
    );

    const trends = (out.trendFindings as { trends: Array<Record<string, unknown>> }).trends;
    expect(trends[0]?.notes).toBe('');
    expect(trends[0]?.evidence).toEqual([
      {
        title: 'Kids SS27',
        url: 'https://example.com/a',
        quote: 'bright prints for kids tees',
      },
      {
        title: 'EU kidswear',
        url: 'https://example.com/b',
        quote: 'pastel palette',
      },
    ]);
    expect(trends[1]?.notes).toBe('soft palette');
    expect(trends[1]?.evidence).toEqual([
      {
        title: 'EU kidswear',
        url: 'https://example.com/b',
        quote: 'pastel palette',
      },
      {
        title: 'Kids SS27',
        url: 'https://example.com/a',
        quote: 'bright prints for kids tees',
      },
    ]);
  });

  it('keeps LLM evidence when already present', () => {
    const out = ensureTrendEvidenceFromSearch(
      {
        trendFindings: {
          summary: 'x',
          trends: [
            {
              name: 'A',
              confidence: 0.7,
              notes: 'grounded',
              evidence: [{ title: 'From model', url: 'https://example.com/keep', quote: 'q' }],
            },
          ],
        },
      },
      {
        tools: [
          {
            code: 'web-search',
            result: {
              results: [{ title: 'Other', url: 'https://example.com/other', snippet: 'x' }],
            },
          },
        ],
      },
    );

    const trends = (out.trendFindings as { trends: Array<Record<string, unknown>> }).trends;
    expect(trends[0]?.evidence).toEqual([
      { title: 'From model', url: 'https://example.com/keep', quote: 'q' },
    ]);
  });

  it('sets evidence=[] when search enrichment is empty', () => {
    const out = ensureTrendEvidenceFromSearch(
      {
        trendFindings: {
          summary: 'x',
          trends: [{ name: 'A', confidence: 0.4 }],
        },
      },
      { tools: [{ code: 'web-search', result: { results: [] } }] },
    );

    const trends = (out.trendFindings as { trends: Array<Record<string, unknown>> }).trends;
    expect(trends[0]?.evidence).toEqual([]);
    expect(trends[0]?.notes).toBe('');
  });
});
