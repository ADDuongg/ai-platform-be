/**
 * Truncate a string so UTF-16 length stays within maxBytes when encoded as UTF-8
 * (approximate using string length for MVP; prefer byteLength when Buffer available).
 */
export function truncateWithMarker(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.byteLength <= maxBytes) {
    return text;
  }
  const marker = '\n...[truncated]';
  const markerBuf = Buffer.from(marker, 'utf8');
  const keep = Math.max(0, maxBytes - markerBuf.byteLength);
  return buf.subarray(0, keep).toString('utf8') + marker;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Tool HTTP request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
