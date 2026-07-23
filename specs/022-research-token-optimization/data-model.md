# Data Model: Research Pipeline & Token Optimization

No new database tables.

## SearchItem (runtime domain)

| Field | Type | Notes |
|-------|------|-------|
| title | string | required |
| url | string | alias of sourceUrl for evidence util |
| sourceUrl | string | canonical product/page URL |
| brand | string? | SerpAPI `source` when shopping |
| price | number? | extracted_price |
| rating | number? | |
| reviewCount | number? | reviews |
| imageUrl | string? | thumbnail |
| snippet | string? | short text |
| bucket | string? | assigned during sampling |
| score | number? | ranking score (optional in output) |

## Tool configJson (`web-search`)

| Key | Default | Notes |
|-----|---------|-------|
| provider | `serpapi` | or `duckduckgo` to force |
| engine | `google_shopping` | SerpAPI engine |
| fetchLimit | 50 | cap 100 |
| maxInputItems | 20 | Top N after preprocess |
| maxResults | — | alias for maxInputItems |
| perBucket | 5 | bucket sampling |

## Enrichment result

```ts
{
  provider: 'serpapi' | 'duckduckgo',
  source: string,
  query: string,
  results: SearchItem[],
  meta: {
    rawCount: number,
    afterDedup: number,
    selectedCount: number,
    fallbackUsed: boolean,
    buckets: string[],
  }
}
```
