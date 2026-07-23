/**
 * Build search query candidates from tool input + tool configJson.
 *
 * Priority:
 * 1. Explicit `input.query` | `input.q` | `input.queries[]`
 * 2. `configJson.queryTemplates[]` with `{{var}}` substitution from input
 * 3. Error — no domain hard-coding in code
 */
export function buildSearchQueries(
  input: Record<string, unknown>,
  configJson: Record<string, unknown> = {},
): string[] {
  const explicit = collectExplicitQueries(input);
  if (explicit.length > 0) {
    return uniquify(explicit);
  }

  const templates = collectTemplates(configJson);
  if (templates.length > 0) {
    const vars = buildTemplateVars(input, configJson);
    const rendered = templates
      .map((tpl) => renderTemplate(tpl, vars))
      .map((q) => q.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (rendered.length > 0) {
      return uniquify(rendered);
    }
  }

  throw new Error(
    'web-search requires input.query / input.queries, or configJson.queryTemplates with matching variables',
  );
}

function collectExplicitQueries(input: Record<string, unknown>): string[] {
  if (typeof input.query === 'string' && input.query.trim()) {
    return [input.query.trim()];
  }
  if (typeof input.q === 'string' && input.q.trim()) {
    return [input.q.trim()];
  }
  if (Array.isArray(input.queries)) {
    return input.queries
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
      .map((q) => q.trim());
  }
  return [];
}

function collectTemplates(configJson: Record<string, unknown>): string[] {
  const raw = configJson.queryTemplates ?? configJson.queryTemplate;
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()];
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim());
  }
  return [];
}

function buildTemplateVars(
  input: Record<string, unknown>,
  configJson: Record<string, unknown>,
): Record<string, string> {
  const aliases = resolveMarketAliases(configJson);
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      vars[key] = String(value).trim();
    }
  }

  if (vars.category) {
    vars.category = vars.category.replace(/-/g, ' ');
  }
  if (vars.market) {
    vars.market = aliases[vars.market] ?? aliases[vars.market.toUpperCase()] ?? vars.market;
  }

  return vars;
}

function resolveMarketAliases(configJson: Record<string, unknown>): Record<string, string> {
  const defaults: Record<string, string> = {
    VN: 'Vietnam',
    vn: 'Vietnam',
    US: 'United States',
    UK: 'United Kingdom',
    JP: 'Japan',
    KR: 'Korea',
  };
  const custom = configJson.marketAliases;
  if (!custom || typeof custom !== 'object' || Array.isArray(custom)) {
    return defaults;
  }
  const out = { ...defaults };
  for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim();
    }
  }
  return out;
}

/** Replace `{{name}}` tokens; unknown keys → empty string. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

function uniquify(queries: string[]): string[] {
  return [...new Set(queries.map((q) => q.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
