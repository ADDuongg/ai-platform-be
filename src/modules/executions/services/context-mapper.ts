/**
 * Flat / dot-path helpers for shared context I/O mapping.
 */

export function getByPath(source: Record<string, unknown>, path: string): unknown {
  if (!path) {
    return undefined;
  }
  if (!path.includes('.')) {
    return source[path];
  }
  const parts = path.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function applyInputMapping(
  context: Record<string, unknown>,
  mapping?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...context };
  }
  const result: Record<string, unknown> = {};
  for (const [key, path] of Object.entries(mapping)) {
    if (typeof path === 'string') {
      result[key] = getByPath(context, path);
    } else {
      result[key] = path;
    }
  }
  return result;
}

export function applyOutputMapping(
  context: Record<string, unknown>,
  output: Record<string, unknown>,
  mapping?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...context, ...output };
  }
  const next = { ...context };
  for (const [contextKey, outputPath] of Object.entries(mapping)) {
    if (typeof outputPath === 'string') {
      next[contextKey] = getByPath(output, outputPath);
    } else {
      next[contextKey] = outputPath;
    }
  }
  return next;
}
