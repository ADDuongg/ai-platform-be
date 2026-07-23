import { randomUUID } from 'crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { ExecutionArtifactEntity } from '../entities/execution-artifact.entity';
import { ExecutionEntity } from '../entities/execution.entity';
import { ArtifactKind, ArtifactPersist, ArtifactStatus } from '../enums';
import { ExecutionArtifactsRepository } from '../repositories/execution-artifacts.repository';
import {
  ARTIFACT_BLOB_STORE,
  type ArtifactBlobStore,
} from './artifact-blob-store';

export interface WorkflowOutputDeclaration {
  key: string;
  kind: ArtifactKind | string;
  label?: string;
  persist: ArtifactPersist | string;
}

export type ArtifactHttpFetcher = (url: string) => Promise<{
  buffer: Buffer;
  contentType: string | null;
}>;

@Injectable()
export class ArtifactMaterializerService {
  private readonly logger = new Logger(ArtifactMaterializerService.name);

  constructor(
    private readonly artifactsRepository: ExecutionArtifactsRepository,
    @Inject(ARTIFACT_BLOB_STORE) private readonly blobStore: ArtifactBlobStore,
    @Inject('ARTIFACT_HTTP_FETCHER')
    private readonly httpFetcher: ArtifactHttpFetcher,
  ) {}

  /**
   * Best-effort: never throws to callers in a way that should fail the Execution.
   * Idempotent when artifacts already exist for the execution.
   */
  async materializeForCompletedExecution(execution: ExecutionEntity): Promise<void> {
    try {
      const existing = await this.artifactsRepository.countByExecutionId(execution.id);
      if (existing > 0) {
        return;
      }

      const declarations = parseOutputDeclarations(
        execution.definitionSnapshot?.definition?.policies,
      );
      if (declarations.length === 0) {
        return;
      }

      const context = execution.contextJson ?? {};
      for (const declaration of declarations) {
        await this.materializeOne(execution, declaration, context);
      }
    } catch (error) {
      this.logger.error(
        `Artifact materialization failed for execution ${execution.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async materializeOne(
    execution: ExecutionEntity,
    declaration: WorkflowOutputDeclaration,
    context: Record<string, unknown>,
  ): Promise<void> {
    const kind = normalizeKind(declaration.kind);
    const persist = normalizePersist(declaration.persist);
    const key = declaration.key?.trim();
    if (!key || !kind || !persist) {
      this.logger.warn(
        `Skipping invalid output declaration on execution ${execution.id}: ${JSON.stringify(declaration)}`,
      );
      return;
    }

    const artifactId = randomUUID();
    const base: Partial<ExecutionArtifactEntity> = {
      id: artifactId,
      executionId: execution.id,
      key,
      kind,
      label: declaration.label?.trim() || null,
      persist,
      sourceNodeId: null,
      errorMessage: null,
      errorJson: null,
      contentJson: null,
      storageKey: null,
      contentType: null,
      byteSize: null,
      status: ArtifactStatus.READY,
    };

    if (!(key in context)) {
      await this.artifactsRepository.createAndSave({
        ...base,
        status: ArtifactStatus.FAILED,
        errorMessage: `Context key "${key}" is missing`,
      });
      return;
    }

    const value = context[key];

    try {
      if (persist === ArtifactPersist.INLINE) {
        await this.artifactsRepository.createAndSave({
          ...base,
          contentJson: toInlineContentJson(kind, value),
          status: ArtifactStatus.READY,
        });
        return;
      }

      if (kind === ArtifactKind.IMAGE_SET) {
        await this.persistImageSet(execution.id, artifactId, base, value);
        return;
      }

      if (
        kind === ArtifactKind.IMAGE ||
        kind === ArtifactKind.FILE ||
        (kind === ArtifactKind.URL && persist === ArtifactPersist.BLOB)
      ) {
        await this.persistSingleBlob(execution.id, artifactId, base, value, kind);
        return;
      }

      // blob + text/json: store serialized JSON as a file
      const buffer = Buffer.from(JSON.stringify(value ?? null), 'utf8');
      const put = await this.blobStore.put({
        executionId: execution.id,
        artifactId,
        relativeName: 'payload.json',
        buffer,
        contentType: 'application/json',
      });
      await this.artifactsRepository.createAndSave({
        ...base,
        storageKey: put.storageKey,
        contentType: put.contentType,
        byteSize: put.byteSize,
        status: ArtifactStatus.READY,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to materialize artifact key=${key} execution=${execution.id}: ${message}`,
      );
      await this.artifactsRepository.createAndSave({
        ...base,
        status: ArtifactStatus.FAILED,
        errorMessage: message,
        errorJson: { message },
      });
    }
  }

  private async persistSingleBlob(
    executionId: string,
    artifactId: string,
    base: Partial<ExecutionArtifactEntity>,
    value: unknown,
    kind: ArtifactKind,
  ): Promise<void> {
    const url = extractAssetUrl(value);
    if (!url) {
      await this.artifactsRepository.createAndSave({
        ...base,
        status: ArtifactStatus.FAILED,
        errorMessage: 'No http(s) asset URL found in context value',
      });
      return;
    }

    const fetched = await this.httpFetcher(url);
    const ext = extensionForContentType(fetched.contentType) || (kind === ArtifactKind.IMAGE ? 'png' : 'bin');
    const put = await this.blobStore.put({
      executionId,
      artifactId,
      relativeName: `asset.${ext}`,
      buffer: fetched.buffer,
      contentType: fetched.contentType ?? 'application/octet-stream',
    });
    await this.artifactsRepository.createAndSave({
      ...base,
      storageKey: put.storageKey,
      contentType: put.contentType,
      byteSize: put.byteSize,
      contentJson: { sourceUrl: url },
      status: ArtifactStatus.READY,
    });
  }

  private async persistImageSet(
    executionId: string,
    artifactId: string,
    base: Partial<ExecutionArtifactEntity>,
    value: unknown,
  ): Promise<void> {
    if (!Array.isArray(value) || value.length === 0) {
      await this.artifactsRepository.createAndSave({
        ...base,
        status: ArtifactStatus.FAILED,
        errorMessage: 'image_set value is empty or not an array',
      });
      return;
    }

    const items: Array<Record<string, unknown>> = [];
    let successCount = 0;

    for (let i = 0; i < value.length; i += 1) {
      const entry = value[i];
      const url = extractAssetUrl(entry);
      if (!url) {
        items.push({
          index: i,
          errorMessage: 'No http(s) asset URL',
          sourceUrl: null,
        });
        continue;
      }
      try {
        const fetched = await this.httpFetcher(url);
        const ext = extensionForContentType(fetched.contentType) || 'png';
        const put = await this.blobStore.put({
          executionId,
          artifactId,
          relativeName: `item-${i}.${ext}`,
          buffer: fetched.buffer,
          contentType: fetched.contentType ?? 'image/png',
        });
        items.push({
          index: i,
          storageKey: put.storageKey,
          contentType: put.contentType,
          byteSize: put.byteSize,
          sourceUrl: url,
        });
        successCount += 1;
      } catch (error) {
        items.push({
          index: i,
          sourceUrl: url,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const allFailed = successCount === 0;
    await this.artifactsRepository.createAndSave({
      ...base,
      contentJson: { items },
      storageKey:
        typeof items[0]?.storageKey === 'string' ? (items[0].storageKey as string) : null,
      contentType:
        typeof items[0]?.contentType === 'string' ? (items[0].contentType as string) : null,
      byteSize: typeof items[0]?.byteSize === 'number' ? (items[0].byteSize as number) : null,
      status: allFailed ? ArtifactStatus.FAILED : ArtifactStatus.READY,
      errorMessage: allFailed ? 'All image_set items failed to materialize' : null,
      errorJson: allFailed ? { items } : null,
    });
  }
}

export function parseOutputDeclarations(
  policies: Record<string, unknown> | undefined | null,
): WorkflowOutputDeclaration[] {
  if (!policies || typeof policies !== 'object') {
    return [];
  }
  const raw = policies.outputs;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is WorkflowOutputDeclaration =>
      !!item && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string',
  );
}

function normalizeKind(kind: string): ArtifactKind | null {
  const value = kind.trim().toLowerCase();
  return (Object.values(ArtifactKind) as string[]).includes(value)
    ? (value as ArtifactKind)
    : null;
}

function normalizePersist(persist: string): ArtifactPersist | null {
  const value = persist.trim().toLowerCase();
  return (Object.values(ArtifactPersist) as string[]).includes(value)
    ? (value as ArtifactPersist)
    : null;
}

function toInlineContentJson(kind: ArtifactKind, value: unknown): Record<string, unknown> {
  if (kind === ArtifactKind.TEXT) {
    if (typeof value === 'string') {
      return { text: value };
    }
    return { text: String(value ?? '') };
  }
  if (kind === ArtifactKind.URL) {
    if (typeof value === 'string') {
      return { url: value };
    }
    if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') {
      return { url: (value as { url: string }).url };
    }
    return { url: String(value ?? '') };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value: value as unknown };
}

function extractAssetUrl(value: unknown): string | null {
  if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const field of ['assetUrl', 'url', 'href']) {
      const candidate = obj[field];
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
        return candidate.trim();
      }
    }
  }
  return null;
}

function extensionForContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
  };
  return map[normalized ?? ''] ?? null;
}

export async function defaultArtifactHttpFetcher(url: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
}> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download artifact URL (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type'),
  };
}
