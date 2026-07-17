import { Injectable } from '@nestjs/common';

import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';
import { fetchWithTimeout, truncateWithMarker } from '../tool-http.util';

/**
 * MVP: native HTTP fetch + constrained text extract.
 * Future: Browserless headless browser service.
 */
@Injectable()
export class WebBrowserAdapter implements ToolAdapter {
  readonly code = 'web-browser';

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const url = resolveUrl(params.input);
    assertHttpUrl(url);

    const res = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: { Accept: 'text/html,text/plain,*/*' },
        redirect: 'follow',
      },
      params.timeoutMs,
    );
    if (!res.ok) {
      throw new Error(`web-browser fetch HTTP ${res.status} for ${url}`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    const raw = await res.text();
    const extracted = extractText(raw, contentType);
    const text = truncateWithMarker(extracted, params.maxBytes);

    return {
      provider: 'native-fetch',
      url,
      contentType,
      text,
      truncated: Buffer.from(extracted, 'utf8').byteLength > params.maxBytes,
    };
  }
}

function resolveUrl(input: Record<string, unknown>): string {
  if (typeof input.url === 'string' && input.url.trim()) {
    return input.url.trim();
  }
  if (typeof input.href === 'string' && input.href.trim()) {
    return input.href.trim();
  }
  if (typeof input.pageUrl === 'string' && input.pageUrl.trim()) {
    return input.pageUrl.trim();
  }
  throw new Error('web-browser requires input.url (http/https)');
}

function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`web-browser invalid URL: ${url}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`web-browser only allows http(s) URLs, got ${parsed.protocol}`);
  }
}

function extractText(raw: string, contentType: string): string {
  if (contentType.includes('text/plain')) {
    return raw.replace(/\s+/g, ' ').trim();
  }
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
