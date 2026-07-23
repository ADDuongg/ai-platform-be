import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

export type PersistSearchResponseParams = {
  storageRoot: string;
  provider: string;
  /** Engine / search_depth / source label for filename */
  label: string;
  query: string;
  input: Record<string, unknown>;
  /** Parsed provider body (no api keys). */
  response: Record<string, unknown>;
};

export type PersistSearchResponseResult = {
  absolutePath: string;
  relativePath: string;
};

const WEB_SEARCH_DIR = 'web-search';
const MAX_QUERY_SLUG = 48;

/**
 * web-search/YYYY-MM-DD/HHmmssZ__{provider}__{label}__{query-slug}__{hash8}.json
 */
export function buildSearchPersistRelativePath(params: {
  savedAt: Date;
  provider: string;
  label: string;
  query: string;
}): string {
  const iso = params.savedAt.toISOString();
  const day = iso.slice(0, 10);
  const time = iso.slice(11, 19).replace(/:/g, '') + 'Z';
  const provider = slugify(params.provider, 24) || 'provider';
  const label = slugify(params.label, 32) || 'default';
  const querySlug = slugify(params.query, MAX_QUERY_SLUG) || 'query';
  const hash = createHash('sha1')
    .update(`${iso}|${params.provider}|${params.label}|${params.query}`)
    .digest('hex')
    .slice(0, 8);
  const file = `${time}__${provider}__${label}__${querySlug}__${hash}.json`;
  return path.join(WEB_SEARCH_DIR, day, file);
}

/** @deprecated Use buildSearchPersistRelativePath */
export function buildSerpApiPersistRelativePath(params: {
  savedAt: Date;
  engine: string;
  query: string;
}): string {
  return buildSearchPersistRelativePath({
    savedAt: params.savedAt,
    provider: 'serpapi',
    label: params.engine,
    query: params.query,
  });
}

export async function persistSearchProviderResponse(
  params: PersistSearchResponseParams,
): Promise<PersistSearchResponseResult> {
  const savedAt = new Date();
  const relativePath = buildSearchPersistRelativePath({
    savedAt,
    provider: params.provider,
    label: params.label,
    query: params.query,
  });
  const absolutePath = path.resolve(params.storageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });

  const payload = {
    savedAt: savedAt.toISOString(),
    provider: params.provider,
    label: params.label,
    query: params.query,
    input: pickLookupInput(params.input),
    response: params.response,
  };

  await writeFile(absolutePath, JSON.stringify(payload, null, 2), 'utf8');
  return { absolutePath, relativePath };
}

/** @deprecated Use persistSearchProviderResponse */
export async function persistSerpApiResponse(params: {
  storageRoot: string;
  engine: string;
  query: string;
  input: Record<string, unknown>;
  response: Record<string, unknown>;
}): Promise<PersistSearchResponseResult> {
  return persistSearchProviderResponse({
    storageRoot: params.storageRoot,
    provider: 'serpapi',
    label: params.engine,
    query: params.query,
    input: params.input,
    response: params.response,
  });
}

function pickLookupInput(input: Record<string, unknown>): Record<string, unknown> {
  const keys = ['season', 'category', 'market', 'ageBand', 'query', 'q', 'queries'] as const;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== '') {
      out[key] = value;
    }
  }
  return out;
}

function slugify(raw: string, maxLen: number): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
}
