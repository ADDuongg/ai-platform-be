import { buildSearchQueries, renderTemplate } from './query-builder';

describe('buildSearchQueries', () => {
  it('prefers explicit input.query', () => {
    expect(
      buildSearchQueries(
        { query: 'pastel kids tee', season: 'SS27' },
        { queryTemplates: ['{{season}} ignored'] },
      ),
    ).toEqual(['pastel kids tee']);
  });

  it('accepts input.queries array', () => {
    expect(buildSearchQueries({ queries: ['a', 'b', 'a'] })).toEqual(['a', 'b']);
  });

  it('renders configJson.queryTemplates from input vars', () => {
    const queries = buildSearchQueries(
      { season: 'SS27', category: 'kids-apparel', market: 'VN' },
      {
        queryTemplates: [
          'kids fashion trends {{season}} {{category}} {{market}}',
          'children clothing trends {{market}} {{season}}',
        ],
      },
    );
    expect(queries).toEqual([
      'kids fashion trends SS27 kids apparel Vietnam',
      'children clothing trends Vietnam SS27',
    ]);
  });

  it('throws when neither query nor templates are available', () => {
    expect(() => buildSearchQueries({ season: 'SS27' }, {})).toThrow(/queryTemplates/);
  });
});

describe('renderTemplate', () => {
  it('substitutes known keys and blanks unknown', () => {
    expect(renderTemplate('hello {{name}} {{missing}}', { name: 'world' })).toBe('hello world ');
  });
});
