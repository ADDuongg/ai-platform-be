import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';

export const MAX_JSON_PAYLOAD_BYTES = 256 * 1024;

export function jsonPayloadByteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

export function assertJsonPayloadSize(
  value: unknown,
  field: string,
  options?: { maxBytes?: number; skipNull?: boolean },
): void {
  const maxBytes = options?.maxBytes ?? MAX_JSON_PAYLOAD_BYTES;
  if (options?.skipNull && value == null) {
    return;
  }

  const size = jsonPayloadByteSize(value);
  if (size > maxBytes) {
    throw new AppException(`${field} exceeds maximum size of 256KB`, HttpStatus.BAD_REQUEST, {
      code: ERROR_CODES.VALIDATION_ERROR,
      details: { field, size },
    });
  }
}

export function assertDefinitionJsonPayloadSize(value: unknown): void {
  assertJsonPayloadSize(value, 'definition');
}
