import { createReadStream } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

/**
 * Platform durable blob store for Execution Artifacts.
 *
 * MVP: local filesystem under ARTIFACT_STORAGE_ROOT.
 * TODO(aws-s3): implement S3ArtifactBlobStore when ARTIFACT_STORAGE=s3
 *   (swap this provider in ExecutionsModule; keep the same interface).
 */
export interface ArtifactBlobStore {
  put(params: {
    executionId: string;
    artifactId: string;
    relativeName: string;
    buffer: Buffer;
    contentType?: string;
  }): Promise<{ storageKey: string; byteSize: number; contentType: string }>;

  getBuffer(storageKey: string): Promise<Buffer>;

  createReadStream(storageKey: string): Promise<Readable>;
}

export const ARTIFACT_BLOB_STORE = Symbol('ARTIFACT_BLOB_STORE');

@Injectable()
export class LocalArtifactBlobStore implements ArtifactBlobStore {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private root(): string {
    const cfg = this.configService.get('artifactStorage', { infer: true });
    return path.resolve(cfg?.storageRoot ?? '.data/execution-artifacts');
  }

  async put(params: {
    executionId: string;
    artifactId: string;
    relativeName: string;
    buffer: Buffer;
    contentType?: string;
  }): Promise<{ storageKey: string; byteSize: number; contentType: string }> {
    const safeName = sanitizeRelative(params.relativeName);
    const storageKey = path.posix.join(
      'executions',
      params.executionId,
      params.artifactId,
      safeName,
    );
    const absolutePath = resolveUnderRoot(this.root(), storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, params.buffer);
    return {
      storageKey,
      byteSize: params.buffer.byteLength,
      contentType: params.contentType ?? 'application/octet-stream',
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer> {
    const absolutePath = resolveUnderRoot(this.root(), storageKey);
    await access(absolutePath);
    return readFile(absolutePath);
  }

  async createReadStream(storageKey: string): Promise<Readable> {
    const absolutePath = resolveUnderRoot(this.root(), storageKey);
    await access(absolutePath);
    return createReadStream(absolutePath);
  }
}

function sanitizeRelative(name: string): string {
  const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter((part) => part && part !== '.' && part !== '..');
  if (parts.length === 0) {
    throw new Error('artifact blob relative name is empty');
  }
  return parts.join('/');
}

function resolveUnderRoot(root: string, relative: string): string {
  const safeRel = sanitizeRelative(relative);
  const absolutePath = path.resolve(root, safeRel);
  const relativeToRoot = path.relative(root, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('artifact blob path traversal rejected');
  }
  return absolutePath;
}
