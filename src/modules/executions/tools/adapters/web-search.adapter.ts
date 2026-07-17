import { Injectable } from '@nestjs/common';

import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';
import { fetchWithTimeout, truncateWithMarker } from '../tool-http.util';

type SearchResult = { title: string; url: string; snippet: string };
type SearchSource = 'duckduckgo-instant' | 'duckduckgo-html';

/**
 * MVP: DuckDuckGo free search (Instant Answer + HTML fallback).
 * Future: Google Custom Search API.
 */
@Injectable()
export class WebSearchAdapter implements ToolAdapter {
  readonly code = 'web-search';

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const queries = buildSearchQueries(params.input);
    const maxResults =
      typeof params.configJson.maxResults === 'number' && params.configJson.maxResults > 0
        ? Math.min(params.configJson.maxResults, 10)
        : 5;

    let results: SearchResult[] = [];
    let activeQuery = queries[0];
    let successfulSource: SearchSource = 'duckduckgo-instant';

    for (const query of queries) {
      activeQuery = query;
      results = await this.searchInstantAnswer(
        query,
        maxResults,
        params.timeoutMs,
        params.maxBytes,
      );
      if (results.length > 0) {
        successfulSource = 'duckduckgo-instant';
        break;
      }
      results = await this.searchHtml(query, maxResults, params.timeoutMs, params.maxBytes);
      if (results.length > 0) {
        successfulSource = 'duckduckgo-html';
        break;
      }
    }

    const payload = {
      provider: 'duckduckgo',
      source: successfulSource,
      query: activeQuery,
      queriesTried: queries,
      results,
    };
    const serialized = truncateWithMarker(JSON.stringify(payload), params.maxBytes);
    return JSON.parse(serialized) as Record<string, unknown>;
  }

  private async searchInstantAnswer(
    query: string,
    maxResults: number,
    timeoutMs: number,
    maxBytes: number,
  ): Promise<SearchResult[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'ai-platform-be/1.0 (+local-dev)' },
      },
      timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`web-search provider HTTP ${res.status}`);
    }
    const rawText = truncateWithMarker(await res.text(), maxBytes);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error('web-search provider returned non-JSON body');
    }
    return mapDuckDuckGoResults(data, maxResults).filter((result) => Boolean(result.url?.trim()));
  }

  private async searchHtml(
    query: string,
    maxResults: number,
    timeoutMs: number,
    maxBytes: number,
  ): Promise<SearchResult[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ai-platform-be/1.0; +https://localhost)',
          Accept: 'text/html',
        },
      },
      timeoutMs,
    );
    if (!res.ok) {
      return [];
    }
    const html = truncateWithMarker(await res.text(), maxBytes);
    return parseDuckDuckGoHtml(html, maxResults);
  }
}

function buildSearchQueries(input: Record<string, unknown>): string[] {
  if (typeof input.query === 'string' && input.query.trim()) {
    return [input.query.trim()];
  }
  if (typeof input.q === 'string' && input.q.trim()) {
    return [input.q.trim()];
  }

  const season = asTrimmedString(input.season);
  const category = asTrimmedString(input.category);
  const market = expandMarket(asTrimmedString(input.market));
  const topic = asTrimmedString(input.topic) || asTrimmedString(input.keywords);

  const queries: string[] = [];
  if (topic) {
    queries.push(topic);
  }
  if (season || category || market) {
    const kidsFashionTrendsQuery = [
      'kids fashion trends',
      season,
      category?.replace(/-/g, ' '),
      market,
    ]
      .filter(Boolean)
      .join(' ');
    const childrenClothingTrendsQuery =
      `children clothing trends ${market || ''} ${season || ''}`.trim();
    const kidsApparelFashionQuery = `kids apparel fashion ${market || 'Vietnam'} 2027`.trim();

    queries.push(kidsFashionTrendsQuery, childrenClothingTrendsQuery, kidsApparelFashionQuery);
  }

  const unique = [...new Set(queries.map((query) => query.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new Error(
      'web-search requires input.query (or season/category/market) to build a search query',
    );
  }
  return unique;
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function expandMarket(market: string): string {
  const map: Record<string, string> = {
    VN: 'Vietnam',
    vn: 'Vietnam',
    US: 'United States',
    UK: 'United Kingdom',
    JP: 'Japan',
    KR: 'Korea',
  };
  return map[market] ?? market;
}

function mapDuckDuckGoResults(data: Record<string, unknown>, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  const heading = typeof data.Heading === 'string' ? data.Heading : '';
  const abstract = typeof data.AbstractText === 'string' ? data.AbstractText : '';
  const abstractUrl = typeof data.AbstractURL === 'string' ? data.AbstractURL : '';
  if (abstract || abstractUrl) {
    results.push({
      title: heading || 'DuckDuckGo Abstract',
      url: abstractUrl,
      snippet: abstract,
    });
  }

  const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
  for (const item of related) {
    if (results.length >= maxResults) break;
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (Array.isArray(row.Topics)) {
      for (const nested of row.Topics) {
        if (results.length >= maxResults) break;
        pushRelated(results, nested, maxResults);
      }
      continue;
    }
    pushRelated(results, row, maxResults);
  }

  return results.slice(0, maxResults);
}

function pushRelated(results: SearchResult[], item: unknown, maxResults: number): void {
  if (results.length >= maxResults) return;
  if (!item || typeof item !== 'object') return;
  const row = item as Record<string, unknown>;
  const text = typeof row.Text === 'string' ? row.Text : '';
  const url =
    row.FirstURL && typeof row.FirstURL === 'string'
      ? row.FirstURL
      : typeof row.URL === 'string'
        ? row.URL
        : '';
  if (!url.trim()) return;
  results.push({
    title: text.slice(0, 120) || url,
    url,
    snippet: text,
  });
}

/**
 * Best-effort parse of DuckDuckGo HTML results page.
 */
function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null && results.length < maxResults) {
    const href = decodeDuckDuckGoHref(match[1] ?? '');
    const title = stripTags(match[2] ?? '').trim();
    if (!href || !/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    results.push({ title: title || href, url: href, snippet: '' });
  }

  if (results.length === 0) {
    const uddgRe = /uddg=([^&"]+)/gi;
    while ((match = uddgRe.exec(html)) !== null && results.length < maxResults) {
      try {
        const href = decodeURIComponent(match[1] ?? '');
        if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
        seen.add(href);
        results.push({ title: href, url: href, snippet: '' });
      } catch {
        // ignore bad encoding
      }
    }
  }

  return results;
}

function decodeDuckDuckGoHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) {
      return decodeURIComponent(uddg);
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return trimmed.startsWith('http') ? trimmed : '';
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
