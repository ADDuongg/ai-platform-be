import type { ToolEnrichmentBundle } from './tool-adapter';

/**
 * Collect http(s) URLs returned by live tools (esp. web-search / web-browser).
 */
export function collectAllowedUrlsFromEnrichment(
  bundle: ToolEnrichmentBundle | null | undefined,
): Set<string> {
  const allowedUrls = new Set<string>();
  if (!bundle?.tools?.length) {
    return allowedUrls;
  }
  for (const item of bundle.tools) {
    collectUrlsFromUnknown(item.result, allowedUrls);
  }
  return allowedUrls;
}

function collectUrlsFromUnknown(value: unknown, allowedUrls: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === 'string') {
    const normalizedUrl = normalizeUrl(value);
    if (normalizedUrl) allowedUrls.add(normalizedUrl);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectUrlsFromUnknown(entry, allowedUrls, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [key, entry] of Object.entries(obj)) {
      if (key.toLowerCase() === 'url' || key.toLowerCase() === 'href' || key.toLowerCase() === 'link') {
        if (typeof entry === 'string') {
          const normalizedUrl = normalizeUrl(entry);
          if (normalizedUrl) allowedUrls.add(normalizedUrl);
        }
      } else {
        collectUrlsFromUnknown(entry, allowedUrls, depth + 1);
      }
    }
  }
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/** First http(s) URL found in nested tool/step payloads (search results, candidates, …). */
export function pickFirstHttpUrl(value: unknown): string | null {
  return findFirstHttpUrl(value, 0);
}

function findFirstHttpUrl(value: unknown, depth: number): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === 'string') {
    return normalizeUrl(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstHttpUrl(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const [key, entry] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (keyLower === 'url' || keyLower === 'href' || keyLower === 'link') {
        if (typeof entry === 'string') {
          const normalizedUrl = normalizeUrl(entry);
          if (normalizedUrl) return normalizedUrl;
        }
      } else {
        const found = findFirstHttpUrl(entry, depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

/**
 * Remove hallucinated reference URLs that were not returned by tools.
 * - If allowlist non-empty: keep only references whose url is in allowlist
 * - If allowlist empty: clear all references arrays (do not invent URLs)
 * Clones the top-level object, then mutates nested nodes of that clone.
 */
export function sanitizeReferencesAgainstAllowlist(
  output: Record<string, unknown>,
  allowedUrls: Set<string>,
): Record<string, unknown> {
  const cloned = structuredClone(output);
  const removed: string[] = [];
  walkAndFilterReferences(cloned, allowedUrls, removed);

  if (removed.length > 0 || allowedUrls.size === 0) {
    maybeAnnotateGaps(cloned, allowedUrls.size === 0);
  }
  return cloned;
}

function walkAndFilterReferences(
  node: unknown,
  allowedUrls: Set<string>,
  removed: string[],
  keyHint = '',
): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    if (keyHint === 'references' || keyHint === 'evidence') {
      const filtered = node.filter((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return allowedUrls.size > 0; // non-object refs: drop if no allowlist
        }
        const row = item as Record<string, unknown>;
        const url = typeof row.url === 'string' ? row.url : '';
        if (!url.trim()) {
          // allow title-only notes only when we have verified sources overall
          return allowedUrls.size > 0;
        }
        const normalizedUrl = normalizeUrl(url);
        if (normalizedUrl && urlAllowed(normalizedUrl, allowedUrls)) {
          row.url = normalizedUrl;
          return true;
        }
        removed.push(url);
        return false;
      });
      node.splice(0, node.length, ...filtered);
      return;
    }
    for (const item of node) {
      walkAndFilterReferences(item, allowedUrls, removed, keyHint);
    }
    return;
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const [key, entry] of Object.entries(obj)) {
      walkAndFilterReferences(entry, allowedUrls, removed, key);
    }
  }
}

function urlAllowed(normalized: string, allowedUrls: Set<string>): boolean {
  if (allowedUrls.size === 0) return false;
  if (allowedUrls.has(normalized)) return true;
  // also allow if host+path match ignoring query differences lightly
  try {
    const candidateUrl = new URL(normalized);
    for (const allowed of allowedUrls) {
      const allowedUrl = new URL(allowed);
      if (candidateUrl.hostname === allowedUrl.hostname && candidateUrl.pathname === allowedUrl.pathname) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function maybeAnnotateGaps(output: Record<string, unknown>, noVerifiedSources: boolean): void {
  if (!noVerifiedSources) return;
  const note =
    'No verified web sources returned by search tools; references omitted to avoid invented URLs';

  const report = output.researchReport;
  if (report && typeof report === 'object' && !Array.isArray(report)) {
    const researchReport = report as Record<string, unknown>;
    const gaps = Array.isArray(researchReport.gaps) ? [...researchReport.gaps] : [];
    if (!gaps.some((gap) => String(gap).includes('verified web sources'))) {
      gaps.push(note);
      researchReport.gaps = gaps;
    }
  }
}
