import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Readable } from 'stream';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';

import { ExecutionArtifactResponseDto } from '../dto/execution-artifact-response.dto';
import { ExecutionArtifactEntity } from '../entities/execution-artifact.entity';
import { ArtifactPersist, ArtifactStatus } from '../enums';
import { ExecutionArtifactsRepository } from '../repositories/execution-artifacts.repository';
import { ExecutionsRepository } from '../repositories/executions.repository';
import { ARTIFACT_BLOB_STORE, type ArtifactBlobStore } from './artifact-blob-store';

export type ArtifactContentResult =
  | { kind: 'json'; body: Record<string, unknown> }
  | {
      kind: 'stream';
      stream: Readable;
      contentType: string;
      byteSize: number | null;
    }
  | { kind: 'buffer'; buffer: Buffer; contentType: string; byteSize: number };

@Injectable()
export class ExecutionArtifactsService {
  constructor(
    private readonly executionsRepository: ExecutionsRepository,
    private readonly artifactsRepository: ExecutionArtifactsRepository,
    @Inject(ARTIFACT_BLOB_STORE) private readonly blobStore: ArtifactBlobStore,
  ) {}

  async list(executionId: string): Promise<ExecutionArtifactResponseDto[]> {
    await this.requireExecution(executionId);
    const rows = await this.artifactsRepository.findAllByExecutionId(executionId);
    return rows.map((row) => this.toDto(row));
  }

  async getContent(
    executionId: string,
    artifactId: string,
    itemIndex?: number,
  ): Promise<ArtifactContentResult> {
    await this.requireExecution(executionId);
    const artifact = await this.artifactsRepository.findByExecutionAndId(
      executionId,
      artifactId,
    );
    if (!artifact) {
      throw new AppException('Artifact not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.ARTIFACT_NOT_FOUND,
      });
    }
    if (artifact.status !== ArtifactStatus.READY) {
      throw new AppException('Artifact is not ready', HttpStatus.CONFLICT, {
        code: ERROR_CODES.ARTIFACT_NOT_READY,
        details: { errorMessage: artifact.errorMessage },
      });
    }

    if (itemIndex !== undefined) {
      const items = Array.isArray(artifact.contentJson?.items)
        ? (artifact.contentJson.items as Array<Record<string, unknown>>)
        : [];
      const item = items[itemIndex];
      const storageKey =
        item && typeof item.storageKey === 'string' ? item.storageKey : null;
      if (!storageKey) {
        throw new AppException('Artifact item not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.ARTIFACT_NOT_FOUND,
        });
      }
      const buffer = await this.blobStore.getBuffer(storageKey);
      return {
        kind: 'buffer',
        buffer,
        contentType:
          typeof item.contentType === 'string'
            ? item.contentType
            : 'application/octet-stream',
        byteSize: buffer.byteLength,
      };
    }

    if (artifact.persist === ArtifactPersist.INLINE || !artifact.storageKey) {
      return {
        kind: 'json',
        body: artifact.contentJson ?? {},
      };
    }

    const stream = await this.blobStore.createReadStream(artifact.storageKey);
    return {
      kind: 'stream',
      stream,
      contentType: artifact.contentType ?? 'application/octet-stream',
      byteSize: artifact.byteSize,
    };
  }

  private async requireExecution(executionId: string): Promise<void> {
    const execution = await this.executionsRepository.findById(executionId);
    if (!execution) {
      throw new AppException('Execution not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXECUTION_NOT_FOUND,
      });
    }
  }

  private toDto(entity: ExecutionArtifactEntity): ExecutionArtifactResponseDto {
    return plainToInstance(
      ExecutionArtifactResponseDto,
      {
        id: entity.id,
        executionId: entity.executionId,
        key: entity.key,
        kind: entity.kind,
        label: entity.label,
        persist: entity.persist,
        status: entity.status,
        contentJson: entity.contentJson,
        storageKey: entity.storageKey,
        contentType: entity.contentType,
        byteSize: entity.byteSize,
        sourceNodeId: entity.sourceNodeId,
        errorMessage: entity.errorMessage,
        createdAt: entity.createdAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
