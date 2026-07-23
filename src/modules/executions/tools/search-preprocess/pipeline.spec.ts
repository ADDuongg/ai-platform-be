import {
  dedupeSearchItems,
  extractSerpApiRows,
  normalizeSearchRows,
  preprocessSearchItems,
  rankSearchItems,
  titlesNearDuplicate,
} from './index';

describe('search-preprocess', () => {
  it('normalizes SerpAPI shopping_results', () => {
    const rows = extractSerpApiRows({
      shopping_results: [
        {
          title: 'Pastel Kids Tee',
          link: 'https://shop.example/p/1',
          source: 'Zara',
          extracted_price: 12.5,
          rating: 4.6,
          reviews: 120,
          thumbnail: 'https://img.example/1.jpg',
          delivery: 'Free shipping',
          extensions: ['In stock'],
        },
      ],
    });
    const items = normalizeSearchRows(rows);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Pastel Kids Tee',
      url: 'https://shop.example/p/1',
      sourceUrl: 'https://shop.example/p/1',
      brand: 'Zara',
      price: 12.5,
      rating: 4.6,
      reviewCount: 120,
    });
    expect((items[0] as Record<string, unknown>).delivery).toBeUndefined();
  });

  it('dedupes by URL and near-duplicate titles', () => {
    const items = dedupeSearchItems([
      {
        title: 'Blue Tee',
        url: 'https://a.example/x?utm=1',
        sourceUrl: 'https://a.example/x?utm=1',
      },
      {
        title: 'Blue Tee',
        url: 'https://a.example/x',
        sourceUrl: 'https://a.example/x',
        rating: 4.9,
      },
      {
        title: 'Blue T-Shirt',
        url: 'https://b.example/y',
        sourceUrl: 'https://b.example/y',
      },
    ]);
    expect(items.length).toBeLessThanOrEqual(2);
    expect(titlesNearDuplicate('Blue Tee', 'Blue T-Shirt')).toBe(true);
  });

  it('ranks with composite score (not only popularity)', () => {
    const ranked = rankSearchItems(
      [
        {
          title: 'Generic tee',
          url: 'https://nike.com/1',
          sourceUrl: 'https://nike.com/1',
          brand: 'Nike',
          rating: 5,
          reviewCount: 50_000,
        },
        {
          title: 'ocean pastel kids fashion trend',
          url: 'https://niche.example/2',
          sourceUrl: 'https://niche.example/2',
          brand: 'TinyLabel',
          rating: 4.2,
          reviewCount: 40,
        },
      ],
      'ocean pastel kids fashion trend',
    );
    expect(ranked[0]?.title).toMatch(/ocean pastel/i);
  });

  it('pipeline caps at maxInputItems and keeps multiple buckets', () => {
    const raw = Array.from({ length: 40 }, (_, i) => {
      const themes = ['pastel kids tee', 'ocean navy hoodie', 'animal print dress', 'space galaxy set'];
      const theme = themes[i % themes.length]!;
      return {
        title: `${theme} ${i}`,
        link: `https://shop.example/p/${i}`,
        source: i % 3 === 0 ? 'Nike' : i % 3 === 1 ? 'Zara' : `Brand${i}`,
        rating: 3 + (i % 3),
        reviews: 10 * i,
      };
    });

    const { items, meta } = preprocessSearchItems(raw, {
      query: 'kids fashion pastel ocean',
      maxInputItems: 12,
      perBucket: 3,
    });

    expect(items.length).toBeLessThanOrEqual(12);
    expect(meta.rawCount).toBe(40);
    expect(meta.selectedCount).toBe(items.length);
    expect(meta.afterDedup).toBeGreaterThanOrEqual(items.length);
    expect(meta.buckets.length).toBeGreaterThan(1);
    for (const item of items) {
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('url');
      expect((item as Record<string, unknown>).delivery).toBeUndefined();
    }
  });

  it('samples by kindMix shopping/article quotas', () => {
    const rows = [
      {
        title: 'Pastel Tee',
        link: 'https://shop.example/1',
        source: 'Zara',
        rating: 4.9,
        reviews: 100,
        _kind: 'shopping',
        _provider: 'serpapi',
      },
      {
        title: 'Ocean Shirt',
        link: 'https://shop.example/2',
        source: 'Uniqlo',
        rating: 4.5,
        reviews: 50,
        _kind: 'shopping',
        _provider: 'serpapi',
      },
      {
        title: 'Denim Jacket',
        link: 'https://shop.example/3',
        source: 'Gap',
        rating: 4.2,
        reviews: 20,
        _kind: 'shopping',
        _provider: 'serpapi',
      },
      {
        title: 'SS27 pastel ocean trends',
        url: 'https://vogue.com/a',
        content: 'Pastel and ocean motifs for kids SS27',
        _kind: 'article',
        _provider: 'tavily',
      },
      {
        title: 'Kids denim guide',
        url: 'https://blog.example/b',
        content: 'Denim jackets remain popular',
        _kind: 'article',
        _provider: 'tavily',
      },
    ];

    const { items, meta } = preprocessSearchItems(rows, {
      query: 'pastel ocean kids',
      maxInputItems: 4,
      perBucket: 5,
      kindMix: { shopping: 2, article: 2 },
    });

    expect(items).toHaveLength(4);
    expect(meta.selectedByKind).toEqual({ shopping: 2, article: 2 });
    expect(items.filter((i) => i.kind === 'shopping')).toHaveLength(2);
    expect(items.filter((i) => i.kind === 'article')).toHaveLength(2);
  });
});
