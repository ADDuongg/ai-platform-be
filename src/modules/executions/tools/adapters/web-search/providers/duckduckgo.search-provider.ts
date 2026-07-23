import { Injectable } from '@nestjs/common';

import type { RawSearchRow } from '../../../search-preprocess';
import { fetchWithTimeout, truncateWithMarker } from '../../../tool-http.util';
import type {
  WebSearchProvider,
  WebSearchProviderRequest,
  WebSearchProviderResult,
} from '../web-search.provider';

@Injectable()
export class DuckDuckGoSearchProvider implements WebSearchProvider {
  readonly id = 'duckduckgo' as const;

  isAvailable(_configJson: Record<string, unknown>): boolean {
    return true;
  }

  async search(request: WebSearchProviderRequest): Promise<WebSearchProviderResult> {
    try {
      const instant = await this.searchInstantAnswer(request);
      if (instant.length > 0) {
        return { provider: this.id, source: 'duckduckgo-instant', rows: instant };
      }
    } catch {
      // Instant Answer flaky — fall through to HTML scrape
    }
    const html = await this.searchHtml(request);
    return { provider: this.id, source: 'duckduckgo-html', rows: html };
  }

  private async searchInstantAnswer(request: WebSearchProviderRequest): Promise<RawSearchRow[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(request.query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'ai-platform-be/1.0 (+local-dev)' },
      },
      request.timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`duckduckgo Instant Answer HTTP ${res.status}`);
    }
    const rawText = truncateWithMarker(await res.text(), request.maxBytes);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error('duckduckgo Instant Answer returned non-JSON body');
    }
    return mapDuckDuckGoResults(data, request.fetchLimit).filter((row) => {
      const rowUrl = typeof row.url === 'string' ? row.url.trim() : '';
      return Boolean(rowUrl);
    });
  }

  private async searchHtml(request: WebSearchProviderRequest): Promise<RawSearchRow[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(request.query)}`;
    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ai-platform-be/1.0; +https://localhost)',
          Accept: 'text/html',
        },
      },
      request.timeoutMs,
    );
    if (!res.ok) {
      return [];
    }
    const html = truncateWithMarker(await res.text(), request.maxBytes);
    return parseDuckDuckGoHtml(html, request.fetchLimit);
  }
}

function mapDuckDuckGoResults(data: Record<string, unknown>, maxResults: number): RawSearchRow[] {
  const results: RawSearchRow[] = [];

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

function pushRelated(results: RawSearchRow[], item: unknown, maxResults: number): void {
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

function parseDuckDuckGoHtml(html: string, maxResults: number): RawSearchRow[] {
  const results: RawSearchRow[] = [];
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
