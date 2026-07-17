import { MAX_LLM_RESPONSE_BYTES } from '../constants/executions.constants';

export function assertResponseSize(raw: string, maxBytes = MAX_LLM_RESPONSE_BYTES): void {
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > maxBytes) {
    throw new Error(`Model response exceeds max size (${bytes} bytes > ${maxBytes} bytes)`);
  }
}

/**
 * Parse model text as a JSON object. Best-effort strip of markdown fences.
 *
 * Prefer structured output (Ollama `format: <Agent outputSchema>`) so the model
 * already matches the contract. Remaining helpers are light fallbacks for
 * near-miss JSON (fences, flat envelopes, null→empty) — not a second schema engine.
 *
 * Also recovers a narrow llama mistake: duplicate "group"/"items" keys at the
 * root collapsed by JSON.parse (never when inspirationBoard / other envelopes present).
 */
export function parseModelJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Model response is empty (expected JSON object)');
  }

  const candidates = [trimmed, extractFencedJson(trimmed), extractFirstObject(trimmed)].filter(
    (c): c is string => Boolean(c),
  );

  // Try trimmed text, fenced block, then first `{...}` object; duplicate group/items recovery
  // applies only when inspirationBoard / researchReport / trendFindings envelopes are absent.
  let lastError: Error | null = null;
  for (const candidate of candidates) {
    const recovered = recoverDuplicateGroupItemsPayload(candidate);
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && parsed.every(isGroupItemsRow)) {
          return { groupedReferences: parsed };
        }
        throw new Error('Model response JSON must be a non-null object');
      }
      if (parsed === null || typeof parsed !== 'object') {
        throw new Error('Model response JSON must be a non-null object');
      }
      const obj = parsed as Record<string, unknown>;
      if (
        recovered &&
        !Array.isArray(obj.groupedReferences) &&
        !('inspirationBoard' in obj) &&
        !('researchReport' in obj) &&
        !('trendFindings' in obj)
      ) {
        return recovered;
      }
      return obj;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (recovered) {
        return recovered;
      }
    }
  }

  throw new Error(
    `Model response is not valid JSON object: ${lastError?.message ?? 'parse failed'}`,
  );
}

/**
 * When the model emits repeated "group"/"items" keys in one object (invalid JSON
 * shape that parsers collapse), extract each pair into groupedReferences[].
 */
export function recoverDuplicateGroupItemsPayload(raw: string): Record<string, unknown> | null {
  // Nested "group" keys inside inspirationBoard/groups must not trigger recovery
  if (
    /"inspirationBoard"\s*:/.test(raw) ||
    /"groupedReferences"\s*:/.test(raw) ||
    /"researchReport"\s*:/.test(raw) ||
    /"trendFindings"\s*:/.test(raw)
  ) {
    return null;
  }
  const groupKeyCount = (raw.match(/"group"\s*:/g) ?? []).length;
  if (groupKeyCount < 2) {
    return null;
  }
  const pairs = extractGroupItemsPairs(raw);
  if (pairs.length < 2) {
    return null;
  }
  return { groupedReferences: pairs };
}

function extractGroupItemsPairs(text: string): Array<{ group: string; items: unknown[] }> {
  const pairs: Array<{ group: string; items: unknown[] }> = [];
  const groupRe = /"group"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = groupRe.exec(text)) !== null) {
    let group: string;
    try {
      group = JSON.parse(`"${match[1]}"`) as string;
    } catch {
      group = match[1];
    }
    const after = text.slice(match.index + match[0].length);
    const itemsIdx = after.search(/"items"\s*:\s*\[/);
    if (itemsIdx < 0 || itemsIdx > 80) {
      continue;
    }
    const bracketStart = after.indexOf('[', itemsIdx);
    const arrJson = extractBalancedArray(after, bracketStart);
    if (!arrJson) {
      continue;
    }
    try {
      const items = JSON.parse(arrJson) as unknown;
      if (Array.isArray(items)) {
        pairs.push({ group, items });
      }
    } catch {
      // skip malformed items blob
    }
  }
  return pairs;
}

function extractBalancedArray(text: string, start: number): string | null {
  if (start < 0 || text[start] !== '[') {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function isGroupItemsRow(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return typeof row.group === 'string' && 'items' in row;
}

function extractFencedJson(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
}

function extractFirstObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

/**
 * Coerce common LLM near-misses after structured output:
 * - stringified JSON arrays/objects → real arrays/objects
 * - wrap flat payloads into required object envelopes
 * - null → "" / [] for primitives
 * - normalize inspirationBoard for FE handoff
 *
 * Structured `format: <schema>` is the primary constraint; this is a thin safety net.
 */
export function coerceOutputAgainstSchema(
  value: Record<string, unknown>,
  schema: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!isNonTrivialSchema(schema)) {
    return normalizeFashionHandoffShapes(structuredClone(value));
  }
  const cloned = structuredClone(value);
  const wrappedObjects = wrapFlatRequiredObjects(cloned, schema);
  const wrapped = wrapFlatRequiredArrays(wrappedObjects, schema);
  coerceValue(wrapped, schema, '');
  return normalizeFashionHandoffShapes(wrapped);
}

function coerceSummaryString(value: unknown): string {
  return value == null ? '' : String(value);
}

function ensureSummaryString(target: Record<string, unknown>): void {
  if (typeof target.summary !== 'string') {
    target.summary = coerceSummaryString(target.summary);
  }
}

function normalizeSummaryAndLabeledLists(
  target: Record<string, unknown>,
  listKeys: readonly string[],
): void {
  ensureSummaryString(target);
  for (const key of listKeys) {
    target[key] = normalizeLabeledNotesList(target[key]);
  }
}

/** FE handoff normalizers for Kids Fashion Shared Context keys. */
export function normalizeFashionHandoffShapes(
  value: Record<string, unknown>,
): Record<string, unknown> {
  let next = value;
  next = normalizeInspirationBoardShape(next);
  next = normalizeStyleReportShape(next);
  next = normalizeImageGenerationHandoffShapes(next);
  next = normalizeResearchReportShape(next);
  next = normalizeDesignBriefShape(next);
  next = normalizeDesignSpecificationShape(next);
  next = normalizeDesignReviewHandoffShapes(next);
  return next;
}

/**
 * Align inspirationBoard with FE handoff contract:
 * - notes must be string[]
 * - groups[].items and references must be { title, url? } (not bare URL strings)
 */
export function normalizeInspirationBoardShape(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const raw = value.inspirationBoard;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return value;
  }
  const board = raw as Record<string, unknown>;

  if (board.notes == null) {
    board.notes = [];
  } else if (typeof board.notes === 'string') {
    board.notes = board.notes.trim() ? [board.notes.trim()] : [];
  } else if (!Array.isArray(board.notes)) {
    board.notes = [];
  } else {
    board.notes = board.notes
      .map((note) => (typeof note === 'string' ? note : note == null ? null : String(note)))
      .filter((note): note is string => typeof note === 'string');
  }

  if (!Array.isArray(board.references)) {
    board.references = [];
  } else {
    board.references = board.references
      .map(normalizeReferenceItem)
      .filter((item): item is Record<string, unknown> => item != null);
  }

  if (Array.isArray(board.groups)) {
    board.groups = board.groups.map((group) => {
      if (!group || typeof group !== 'object' || Array.isArray(group)) {
        return group;
      }
      const g = group as Record<string, unknown>;
      const name =
        typeof g.group === 'string'
          ? g.group
          : typeof g.theme === 'string'
            ? g.theme
            : typeof g.name === 'string'
              ? g.name
              : '';
      const items = Array.isArray(g.items)
        ? g.items
            .map(normalizeReferenceItem)
            .filter((item): item is Record<string, unknown> => item != null)
        : [];
      return {
        ...g,
        group: name || 'Untitled',
        items,
      };
    });
  }

  value.inspirationBoard = board;
  return value;
}

/**
 * Align styleReport with FE handoff contract:
 * colors/styles/patterns/illustrationNotes/recommendations must be { label, notes? }[]
 * (LLM often returns { summary, findings: [...] } or null).
 */
export function normalizeStyleReportShape(value: Record<string, unknown>): Record<string, unknown> {
  const raw = value.styleReport;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return value;
  }
  const report = raw as Record<string, unknown>;
  normalizeSummaryAndLabeledLists(report, [
    'colors',
    'styles',
    'patterns',
    'illustrationNotes',
    'recommendations',
  ]);

  value.styleReport = report;
  return value;
}

/**
 * Align image-generation handoff keys with FE readers:
 * - id as string, non-empty label (fallback from text/assetUrl)
 * - rawGenerations as array (LLM sometimes emits { "0": {...}, "1": {...} })
 */
export function normalizeImageGenerationHandoffShapes(
  value: Record<string, unknown>,
): Record<string, unknown> {
  if (value.imageGenPrompts && typeof value.imageGenPrompts === 'object') {
    const promptsObj = value.imageGenPrompts as Record<string, unknown>;
    ensureSummaryString(promptsObj);
    const list = coerceToArray(promptsObj.prompts);
    promptsObj.prompts = list
      .map((item, i) => normalizePromptItem(item, i))
      .filter((item): item is Record<string, unknown> => item != null);
    value.imageGenPrompts = promptsObj;
  }

  if (value.rawGenerations != null) {
    value.rawGenerations = coerceToArray(value.rawGenerations)
      .map((item, i) => normalizeVariationItem(item, i))
      .filter((item): item is Record<string, unknown> => item != null);
  }

  if (value.generatedImages && typeof value.generatedImages === 'object') {
    const images = value.generatedImages as Record<string, unknown>;
    ensureSummaryString(images);
    const list = coerceToArray(images.variations);
    images.variations = list
      .map((item, i) => normalizeVariationItem(item, i))
      .filter((item): item is Record<string, unknown> => item != null);
    value.generatedImages = images;
  }

  return value;
}

/**
 * Align researchReport with FE: trends/references/gaps arrays (null → []).
 */
export function normalizeResearchReportShape(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const raw = value.researchReport;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return value;
  }
  const report = raw as Record<string, unknown>;
  ensureSummaryString(report);

  report.trends = coerceToArray(report.trends).filter(
    (item) => item && typeof item === 'object' && !Array.isArray(item),
  );

  report.references = coerceToArray(report.references)
    .map(normalizeReferenceItem)
    .filter((item): item is Record<string, unknown> => item != null);

  report.gaps = coerceToArray(report.gaps)
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        if (typeof row.label === 'string' && row.label.trim()) return row.label.trim();
        if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
        if (typeof row.title === 'string' && row.title.trim()) return row.title.trim();
      }
      return null;
    })
    .filter((item): item is string => typeof item === 'string' && item.length > 0);

  value.researchReport = report;
  return value;
}

/**
 * Align designBrief with FE: themes/mustHaves/avoid as { label, notes? }[].
 */
export function normalizeDesignBriefShape(value: Record<string, unknown>): Record<string, unknown> {
  const raw = value.designBrief;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return value;
  }
  const brief = raw as Record<string, unknown>;
  normalizeSummaryAndLabeledLists(brief, ['themes', 'mustHaves', 'avoid']);

  value.designBrief = brief;
  return value;
}

/**
 * Align designSpecification list fields with FE labeled-note contract.
 */
export function normalizeDesignSpecificationShape(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const raw = value.designSpecification;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return value;
  }
  const spec = raw as Record<string, unknown>;
  normalizeSummaryAndLabeledLists(spec, [
    'objectives',
    'constraints',
    'colorDirection',
    'styleDirection',
    'patternDirection',
    'deliverables',
  ]);

  value.designSpecification = spec;
  return value;
}

/**
 * Align design-review handoff keys: coerce ids to string, null lists → [].
 */
export function normalizeDesignReviewHandoffShapes(
  value: Record<string, unknown>,
): Record<string, unknown> {
  if (value.qualityReview && typeof value.qualityReview === 'object') {
    const review = value.qualityReview as Record<string, unknown>;
    ensureSummaryString(review);
    review.findings = coerceToArray(review.findings)
      .map((item, i) => normalizeIdLabeledItem(item, i, 'finding'))
      .filter((item): item is Record<string, unknown> => item != null);
    value.qualityReview = review;
  }

  if (value.improvementSuggestions && typeof value.improvementSuggestions === 'object') {
    const suggestions = value.improvementSuggestions as Record<string, unknown>;
    ensureSummaryString(suggestions);
    suggestions.suggestions = coerceToArray(suggestions.suggestions)
      .map((item, i) => normalizeIdLabeledItem(item, i, 'suggestion'))
      .filter((item): item is Record<string, unknown> => item != null);
    value.improvementSuggestions = suggestions;
  }

  if (value.designReviewScore && typeof value.designReviewScore === 'object') {
    const score = value.designReviewScore as Record<string, unknown>;
    ensureSummaryString(score);
    if (typeof score.overallScore !== 'number' || Number.isNaN(score.overallScore)) {
      const n = Number(score.overallScore);
      score.overallScore = Number.isFinite(n) ? n : 0;
    }
    if (score.perVariation != null) {
      score.perVariation = coerceToArray(score.perVariation)
        .map(normalizePerVariationScore)
        .filter((item): item is Record<string, unknown> => item != null);
    }
    if (score.criteria != null) {
      score.criteria = coerceToArray(score.criteria)
        .map((item, i) => normalizeIdLabeledItem(item, i, 'criterion'))
        .filter((item): item is Record<string, unknown> => item != null);
    }
    if (score.notes != null) {
      score.notes = coerceToArray(score.notes)
        .map((note) => (typeof note === 'string' ? note : note == null ? null : String(note)))
        .filter((note): note is string => typeof note === 'string' && note.trim().length > 0);
    }
    value.designReviewScore = score;
  }

  return value;
}

function normalizeIdLabeledItem(
  value: unknown,
  index: number,
  prefix: string,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (typeof value === 'string' && value.trim()) {
      return { id: `${prefix}-${index + 1}`, label: value.trim() };
    }
    return null;
  }
  const row = value as Record<string, unknown>;
  const label =
    typeof row.label === 'string'
      ? row.label.trim()
      : typeof row.name === 'string'
        ? row.name.trim()
        : typeof row.title === 'string'
          ? row.title.trim()
          : '';
  if (!label) {
    return null;
  }
  const out: Record<string, unknown> = {
    id: asIdString(row.id, `${prefix}-${index + 1}`),
    label,
  };
  if (typeof row.notes === 'string') out.notes = row.notes;
  if (typeof row.severity === 'string') out.severity = row.severity;
  if (typeof row.priority === 'string') out.priority = row.priority;
  if (typeof row.variationRef === 'string') out.variationRef = row.variationRef;
  else if (typeof row.variationRef === 'number') {
    out.variationRef = String(row.variationRef);
  }
  if (typeof row.score === 'number' && !Number.isNaN(row.score)) {
    out.score = row.score;
  } else if (typeof row.score === 'string' && row.score.trim()) {
    const n = Number(row.score);
    if (Number.isFinite(n)) out.score = n;
  }
  return out;
}

function normalizePerVariationScore(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const variationRef =
    typeof row.variationRef === 'string'
      ? row.variationRef.trim()
      : typeof row.variationRef === 'number'
        ? String(row.variationRef)
        : typeof row.id === 'string'
          ? row.id.trim()
          : '';
  if (!variationRef) {
    return null;
  }
  let score: number | undefined;
  if (typeof row.score === 'number' && !Number.isNaN(row.score)) {
    score = row.score;
  } else if (typeof row.score === 'string') {
    const n = Number(row.score);
    if (Number.isFinite(n)) score = n;
  }
  if (score === undefined) {
    return null;
  }
  const out: Record<string, unknown> = { variationRef, score };
  if (typeof row.notes === 'string') out.notes = row.notes;
  return out;
}

function coerceToArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return [];
    }
    // Prefer numeric keys in order when object looks like array-like
    const numeric = keys.every((k) => /^\d+$/.test(k));
    if (numeric) {
      return keys.sort((a, b) => Number(a) - Number(b)).map((k) => obj[k]);
    }
    return Object.values(obj);
  }
  return [];
}

function asIdString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function normalizePromptItem(value: unknown, index: number): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const text =
    typeof row.text === 'string'
      ? row.text.trim()
      : typeof row.prompt === 'string'
        ? row.prompt.trim()
        : '';
  if (!text) {
    return null;
  }
  const id = asIdString(row.id, `prompt-${index + 1}`);
  let label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) {
    label = `Variation ${index + 1}`;
  }
  return { id, label, text };
}

function normalizeVariationItem(value: unknown, index: number): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const assetUrl = typeof row.assetUrl === 'string' ? row.assetUrl.trim() : '';
  const notes = typeof row.notes === 'string' ? row.notes : undefined;
  const hasExplicitLabel = typeof row.label === 'string' && row.label.trim().length > 0;
  if (!assetUrl && !hasExplicitLabel && notes === undefined) {
    return null;
  }
  const id = asIdString(row.id, `gen-var-${index + 1}`);
  let label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) {
    label = assetUrl ? titleFromUrl(assetUrl) : `Variation ${index + 1}`;
  }
  const out: Record<string, unknown> = { id, label };
  if (assetUrl) out.assetUrl = assetUrl;
  if (typeof row.promptRef === 'string' && row.promptRef.trim()) {
    out.promptRef = row.promptRef.trim();
  } else if (typeof row.promptRef === 'number') {
    out.promptRef = String(row.promptRef);
  }
  if (notes !== undefined) {
    out.notes = notes;
  }
  return out;
}

function normalizeLabeledNotesList(value: unknown): Array<{ label: string; notes?: string }> {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map(normalizeLabeledNote)
      .filter((item): item is { label: string; notes?: string } => item != null);
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.findings)) {
      return obj.findings
        .map(normalizeLabeledNote)
        .filter((item): item is { label: string; notes?: string } => item != null);
    }
    const one = normalizeLabeledNote(obj);
    return one ? [one] : [];
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ label: value.trim() }];
  }
  return [];
}

function normalizeLabeledNote(value: unknown): { label: string; notes?: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const label =
    typeof row.label === 'string'
      ? row.label.trim()
      : typeof row.name === 'string'
        ? row.name.trim()
        : typeof row.title === 'string'
          ? row.title.trim()
          : '';
  if (!label) {
    return null;
  }
  const notes =
    typeof row.notes === 'string'
      ? row.notes
      : typeof row.description === 'string'
        ? row.description
        : undefined;
  return notes !== undefined ? { label, notes } : { label };
}

function normalizeReferenceItem(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string' && value.trim()) {
    const url = value.trim();
    return { title: titleFromUrl(url), url };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const url =
    typeof row.url === 'string' && row.url.trim()
      ? row.url.trim()
      : typeof row.referenceUrl === 'string' && row.referenceUrl.trim()
        ? row.referenceUrl.trim()
        : undefined;
  let title = typeof row.title === 'string' ? row.title.trim() : '';
  if (!title && url) {
    title = titleFromUrl(url);
  }
  if (!title) {
    return null;
  }
  const out: Record<string, unknown> = { title };
  if (url) out.url = url;
  if (typeof row.thumbnailUrl === 'string' && row.thumbnailUrl.trim()) {
    out.thumbnailUrl = row.thumbnailUrl.trim();
  }
  if (typeof row.notes === 'string') {
    out.notes = row.notes;
  }
  return out;
}

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    const last = path.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : u.hostname;
  } catch {
    return url.slice(0, 80);
  }
}

/**
 * If schema requires `foo` as an object with nested properties, and the model
 * returned those nested keys at the top level instead of under `foo`, wrap them.
 */
function wrapFlatRequiredObjects(
  value: Record<string, unknown>,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return value;
  }
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const props = properties as Record<string, Record<string, unknown>>;

  let next = value;
  for (const key of required) {
    if (key in next && next[key] !== undefined) {
      continue;
    }
    const propSchema = props[key];
    if (!propSchema || propSchema.type !== 'object') {
      continue;
    }
    const nestedProps = propSchema.properties;
    if (!nestedProps || typeof nestedProps !== 'object' || Array.isArray(nestedProps)) {
      continue;
    }
    const nestedKeys = Object.keys(nestedProps);
    if (nestedKeys.length === 0) {
      continue;
    }
    const present = nestedKeys.filter((k) => k in next && next[k] !== undefined);
    if (present.length === 0) {
      continue;
    }
    // Require at least half of nested keys (or all required nested) at top level
    const nestedRequired = Array.isArray(propSchema.required)
      ? (propSchema.required as string[])
      : [];
    const requiredPresent = nestedRequired.length === 0 || nestedRequired.every((k) => k in next);
    if (!requiredPresent && present.length < Math.ceil(nestedKeys.length / 2)) {
      continue;
    }

    const envelope: Record<string, unknown> = {};
    for (const k of nestedKeys) {
      if (k in next) {
        envelope[k] = next[k];
      }
    }
    next = { ...next };
    for (const k of nestedKeys) {
      delete next[k];
    }
    next[key] = envelope;
  }
  return next;
}

/**
 * Wrap single { group, items } (or aliases) into required array envelopes
 * like groupedReferences / imageCandidates.
 */
function wrapFlatRequiredArrays(
  value: Record<string, unknown>,
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return value;
  }
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const props = properties as Record<string, Record<string, unknown>>;

  let next = value;
  for (const key of required) {
    const propSchema = props[key];
    if (!propSchema || propSchema.type !== 'array') {
      continue;
    }

    const current = next[key];
    if (isGroupItemsRow(current)) {
      next = { ...next, [key]: [current] };
      continue;
    }
    if (Array.isArray(current) && key === 'groupedReferences') {
      const normalized = normalizeGroupedReferencesEntries(current);
      if (normalized) {
        next = { ...next, [key]: normalized };
      }
      continue;
    }
    if (key in next && next[key] !== undefined) {
      continue;
    }

    const aliasKeys = ['groups', 'clusters', 'references', 'result'];
    let aliased: unknown;
    for (const alias of aliasKeys) {
      if (alias === key) continue;
      if (Array.isArray(next[alias])) {
        aliased = next[alias];
        next = { ...next };
        delete next[alias];
        break;
      }
    }
    if (aliased !== undefined) {
      next = { ...next, [key]: aliased };
      continue;
    }

    if (isGroupItemsRow(next)) {
      const row = { group: next.group, items: next.items };
      next = { ...next };
      delete next.group;
      delete next.items;
      next[key] = [row];
      continue;
    }

    // llama often emits { "group1": [...], "group2": [...] } instead of groupedReferences
    const fromKeyed = mapKeyedArraysToGroupedReferences(next);
    if (fromKeyed) {
      next = { [key]: fromKeyed };
    }
  }
  return next;
}

/**
 * Convert { group1: items[], group2: items[], ... } or any all-array-valued
 * object into [{ group, items }, ...].
 */
function mapKeyedArraysToGroupedReferences(
  value: Record<string, unknown>,
): Array<{ group: string; items: unknown[] }> | null {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }
  if (!entries.every(([, v]) => Array.isArray(v))) {
    return null;
  }

  const numbered = entries.filter(([k]) => /^group\d+$/i.test(k));
  const useEntries = numbered.length >= 1 ? numbered : entries;
  if (useEntries.length === 0) {
    return null;
  }

  useEntries.sort(([a], [b]) => {
    const na = Number((/^group(\d+)$/i.exec(a) ?? [])[1] ?? 0);
    const nb = Number((/^group(\d+)$/i.exec(b) ?? [])[1] ?? 0);
    return na - nb || a.localeCompare(b);
  });

  return useEntries.map(([name, items]) => ({
    group: /^group\d+$/i.test(name) ? `Group ${name.replace(/^group/i, '')}` : name,
    items: items as unknown[],
  }));
}

/** [{ "Retro Colorful": [url, ...] }, ...] → [{ group, items }] */
function normalizeGroupedReferencesEntries(
  value: unknown[],
): Array<{ group: string; items: unknown[] }> | null {
  if (value.length === 0) {
    return null;
  }
  if (value.every(isGroupItemsRow)) {
    return null; // already correct
  }

  const out: Array<{ group: string; items: unknown[] }> = [];
  for (const entry of value) {
    if (isGroupItemsRow(entry)) {
      out.push({
        group: (entry as { group: string }).group,
        items: (entry as { items: unknown[] }).items,
      });
      continue;
    }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    // theme alias
    if (typeof obj.theme === 'string' && Array.isArray(obj.items)) {
      out.push({ group: obj.theme, items: obj.items });
      continue;
    }
    // single-key map: { "Retro Colorful": [urls] }
    const keys = Object.keys(obj);
    if (keys.length === 1 && Array.isArray(obj[keys[0]])) {
      out.push({ group: keys[0], items: obj[keys[0]] as unknown[] });
      continue;
    }
    const mapped = mapKeyedArraysToGroupedReferences(obj);
    if (mapped) {
      out.push(...mapped);
    }
  }
  return out.length > 0 ? out : null;
}

function coerceValue(value: unknown, schema: Record<string, unknown>, path: string): unknown {
  if (!schema || typeof schema !== 'object') {
    return value;
  }

  const expected = schema.type;

  if (expected === 'array' && typeof value === 'string') {
    const parsed = tryParseJsonString(value);
    if (Array.isArray(parsed)) {
      value = parsed;
    }
  } else if (expected === 'object' && typeof value === 'string') {
    const parsed = tryParseJsonString(value);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      value = parsed;
    }
  }

  if (
    expected === 'object' &&
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const obj = value as Record<string, unknown>;
    const properties = schema.properties;
    if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
      for (const [key, propSchema] of Object.entries(
        properties as Record<string, Record<string, unknown>>,
      )) {
        if (!(key in obj) || obj[key] === undefined) {
          continue;
        }
        obj[key] = coerceValue(obj[key], propSchema, path ? `${path}.${key}` : key);
      }
    }
    return obj;
  }

  if (expected === 'array' && Array.isArray(value)) {
    const items = schema.items;
    if (items && typeof items === 'object' && !Array.isArray(items)) {
      return value.map((item, i) =>
        coerceValue(item, items as Record<string, unknown>, `${path}[${i}]`),
      );
    }
    return value;
  }

  // Common LLM nulls / scalars → schema primitives
  if (expected === 'string') {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }
  if (expected === 'array' && (value === null || value === undefined)) {
    return [];
  }

  return value;
}

function tryParseJsonString(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed || (trimmed[0] !== '[' && trimmed[0] !== '{')) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Lightweight JSON Schema check for Agent output contracts.
 * Trivial schemas (`{}` or `{ type: 'object' }` without properties/required) are skipped.
 * Nested object properties are validated recursively.
 */
export function validateAgainstOutputSchema(
  value: Record<string, unknown>,
  schema: Record<string, unknown> | null | undefined,
): void {
  if (!isNonTrivialSchema(schema)) {
    return;
  }
  validateNode(value, schema, '');
}

function validateNode(value: unknown, schema: Record<string, unknown>, path: string): void {
  assertType(value, schema, path || '(root)');

  if (schema.type === 'object' || (!schema.type && hasObjectShape(schema))) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }
    const obj = value as Record<string, unknown>;
    const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
    for (const key of required) {
      if (!(key in obj) || obj[key] === undefined) {
        const label = path ? `${path}.${key}` : key;
        throw new Error(`Output failed schema: missing required property "${label}"`);
      }
    }

    const properties = schema.properties;
    if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
      for (const [key, propSchema] of Object.entries(
        properties as Record<string, Record<string, unknown>>,
      )) {
        if (!(key in obj) || obj[key] === undefined) {
          continue;
        }
        const childPath = path ? `${path}.${key}` : key;
        validateNode(obj[key], propSchema, childPath);
      }
    }
  }

  if (schema.type === 'array' && Array.isArray(value)) {
    const items = schema.items;
    if (items && typeof items === 'object' && !Array.isArray(items)) {
      value.forEach((item, i) => {
        validateNode(item, items as Record<string, unknown>, `${path}[${i}]`);
      });
    }
  }
}

function hasObjectShape(schema: Record<string, unknown>): boolean {
  return Boolean(schema.properties || schema.required);
}

export function isNonTrivialSchema(
  schema: Record<string, unknown> | null | undefined,
): schema is Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const keys = Object.keys(schema);
  if (keys.length === 0) {
    return false;
  }
  if (keys.length === 1 && schema.type === 'object' && !schema.properties && !schema.required) {
    return false;
  }
  return Boolean(schema.properties || schema.required);
}

function assertType(value: unknown, propSchema: Record<string, unknown>, path: string): void {
  const expected = propSchema.type;
  if (!expected || typeof expected !== 'string') {
    return;
  }
  switch (expected) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`Output failed schema: "${path}" must be string`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`Output failed schema: "${path}" must be number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`Output failed schema: "${path}" must be boolean`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        throw new Error(`Output failed schema: "${path}" must be array`);
      }
      break;
    case 'object':
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`Output failed schema: "${path}" must be object`);
      }
      break;
    default:
      break;
  }
}
