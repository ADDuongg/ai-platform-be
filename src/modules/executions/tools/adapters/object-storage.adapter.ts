import { createHash } from 'crypto';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

import type { ToolAdapter, ToolAdapterInvokeInput } from '../tool-adapter';

/**
 * MVP: local filesystem under TOOL_STORAGE_ROOT.
 * Future: AWS S3 object storage.
 */
@Injectable()
export class ObjectStorageAdapter implements ToolAdapter {
  readonly code = 'object-storage';

  async invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>> {
    const root = path.resolve(params.storageRoot);
    await mkdir(root, { recursive: true });

    const operation =
      typeof params.input.operation === 'string'
        ? params.input.operation.toLowerCase()
        : inferOperation(params.input);

    if (operation === 'get' || operation === 'read') {
      return this.getObject(root, params.input, params.maxBytes);
    }

    return this.putObject(root, params.input, params.maxBytes);
  }

  private async putObject(
    root: string,
    input: Record<string, unknown>,
    maxBytes: number,
  ): Promise<Record<string, unknown>> {
    const { safeRel, absolutePath } = resolveStoragePath(root, input);

    const { buffer, contentType } = encodeContent(input);
    if (buffer.byteLength > maxBytes) {
      throw new Error(
        `object-storage put exceeds max size (${buffer.byteLength} > ${maxBytes} bytes)`,
      );
    }

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    return {
      provider: 'filesystem',
      operation: 'put',
      key: safeRel,
      uri: `file://${absolutePath}`,
      path: absolutePath,
      bytes: buffer.byteLength,
      contentType,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  }

  private async getObject(
    root: string,
    input: Record<string, unknown>,
    maxBytes: number,
  ): Promise<Record<string, unknown>> {
    const { safeRel, absolutePath } = resolveStoragePath(root, input);

    try {
      await access(absolutePath);
    } catch {
      throw new Error(`object-storage object not found: ${safeRel}`);
    }

    const buffer = await readFile(absolutePath);
    if (buffer.byteLength > maxBytes) {
      throw new Error(
        `object-storage get exceeds max size (${buffer.byteLength} > ${maxBytes} bytes)`,
      );
    }

    return {
      provider: 'filesystem',
      operation: 'get',
      key: safeRel,
      uri: `file://${absolutePath}`,
      path: absolutePath,
      bytes: buffer.byteLength,
      contentBase64: buffer.toString('base64'),
    };
  }
}

function resolveStoragePath(
  root: string,
  input: Record<string, unknown>,
): { safeRel: string; absolutePath: string; executionId: string } {
  const key = resolveKey(input);
  const safeRel = sanitizeKey(key);
  const executionId =
    typeof input.executionId === 'string' && input.executionId.trim()
      ? input.executionId.trim()
      : 'default';
  const absolutePath = resolveUnderRoot(root, path.join(executionId, safeRel));
  return { safeRel, absolutePath, executionId };
}

function inferOperation(input: Record<string, unknown>): 'put' | 'get' {
  if (hasExplicitContent(input)) {
    return 'put';
  }
  // Explicit key without body → read existing object
  if (hasExplicitKey(input)) {
    return 'get';
  }
  // Pre-step enrichment (organizer/scorer): no key/content → put step metadata JSON
  return 'put';
}

function hasExplicitKey(input: Record<string, unknown>): boolean {
  return [input.key, input.path, input.assetKey].some(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
}

function hasExplicitContent(input: Record<string, unknown>): boolean {
  return (
    input.content != null ||
    input.contentBase64 != null ||
    (typeof input.text === 'string' && input.text.length > 0)
  );
}

function resolveKey(input: Record<string, unknown>): string {
  if (typeof input.key === 'string' && input.key.trim()) {
    return input.key.trim();
  }
  if (typeof input.path === 'string' && input.path.trim()) {
    return input.path.trim();
  }
  if (typeof input.assetKey === 'string' && input.assetKey.trim()) {
    return input.assetKey.trim();
  }
  // Deterministic key from content hash when only content provided
  const { buffer } = encodeContent(input);
  return `auto/${createHash('sha256').update(buffer).digest('hex').slice(0, 16)}`;
}

function sanitizeKey(key: string): string {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter((part) => part && part !== '.' && part !== '..');
  if (parts.length === 0) {
    throw new Error('object-storage key is empty after sanitization');
  }
  return parts.join('/');
}

function resolveUnderRoot(root: string, relative: string): string {
  const absolutePath = path.resolve(root, relative);
  const relativeToRoot = path.relative(root, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('object-storage path traversal rejected');
  }
  return absolutePath;
}

const STORAGE_META_KEYS = new Set([
  'operation',
  'key',
  'path',
  'assetKey',
  'executionId',
  'content',
  'contentBase64',
  'text',
  'contentType',
]);

function encodeContent(input: Record<string, unknown>): {
  buffer: Buffer;
  contentType: string;
} {
  if (typeof input.contentBase64 === 'string') {
    return {
      buffer: Buffer.from(input.contentBase64, 'base64'),
      contentType:
        typeof input.contentType === 'string' ? input.contentType : 'application/octet-stream',
    };
  }

  const plainText =
    typeof input.text === 'string'
      ? input.text
      : typeof input.content === 'string'
        ? input.content
        : null;
  if (plainText !== null) {
    return {
      buffer: Buffer.from(plainText, 'utf8'),
      contentType: typeof input.contentType === 'string' ? input.contentType : 'text/plain',
    };
  }

  if (input.content && typeof input.content === 'object') {
    return {
      buffer: Buffer.from(JSON.stringify(input.content), 'utf8'),
      contentType: 'application/json',
    };
  }

  // Enrichment put: persist step input (minus storage control fields) as JSON metadata
  const payload: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (!STORAGE_META_KEYS.has(key)) {
      payload[key] = entry;
    }
  }
  return {
    buffer: Buffer.from(JSON.stringify(payload), 'utf8'),
    contentType: 'application/json',
  };
}
