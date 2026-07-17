import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';
import type { WorkflowDefinition } from '@modules/workflows/types';

/**
 * Reads `policies.requiredInputs` (string[]) from a Workflow definition.
 * Non-array / empty → no required keys.
 */
export function extractRequiredInputs(definition: WorkflowDefinition | null | undefined): string[] {
  const raw = definition?.policies?.requiredInputs;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((key): key is string => typeof key === 'string' && key.length > 0);
}

export function isBlankInputValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  return false;
}

/**
 * Rejects start when any declared required input key is missing or blank.
 * Does not create/enqueue — caller must invoke before persist.
 */
export function assertRequiredInputs(
  definition: WorkflowDefinition,
  input: Record<string, unknown>,
): void {
  const required = extractRequiredInputs(definition);
  if (required.length === 0) {
    return;
  }

  const missing: string[] = [];
  const blank: string[] = [];

  for (const key of required) {
    if (!(key in input) || input[key] === undefined) {
      missing.push(key);
      continue;
    }
    if (isBlankInputValue(input[key])) {
      blank.push(key);
    }
  }

  if (missing.length === 0 && blank.length === 0) {
    return;
  }

  throw new AppException('Execution input is missing required fields', HttpStatus.BAD_REQUEST, {
    code: ERROR_CODES.VALIDATION_ERROR,
    details: {
      field: 'input',
      required,
      missing,
      blank,
    },
  });
}
