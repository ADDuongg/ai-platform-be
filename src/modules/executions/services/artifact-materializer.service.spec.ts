import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';

import { ArtifactKind, ArtifactPersist, ArtifactStatus } from '../enums';
import { ExecutionEntity } from '../entities/execution.entity';
import { ExecutionStatus } from '../enums';
import { ExecutionArtifactsRepository } from '../repositories/execution-artifacts.repository';
import type { ArtifactBlobStore } from './artifact-blob-store';
import { LocalArtifactBlobStore } from './artifact-blob-store';
import {
  ArtifactMaterializerService,
  type ArtifactHttpFetcher,
} from './artifact-materializer.service';
import { ConfigService } from '@nestjs/config';

describe('ArtifactMaterializerService', () => {
  let artifactsRepository: jest.Mocked<ExecutionArtifactsRepository>;
  let blobStore: ArtifactBlobStore;
  let httpFetcher: jest.MockedFunction<ArtifactHttpFetcher>;
  let service: ArtifactMaterializerService;
  let storageRoot: string;

  const baseExecution = {
    id: 'exec-1',
    status: ExecutionStatus.COMPLETED,
    contextJson: {} as Record<string, unknown>,
    definitionSnapshot: {
      definition: {
        nodes: [],
        edges: [],
        variables: {},
        policies: {},
      },
    },
  } as unknown as ExecutionEntity;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(tmpdir(), 'artifact-store-'));
    artifactsRepository = {
      countByExecutionId: jest.fn().mockResolvedValue(0),
      createAndSave: jest.fn().mockImplementation(async (data) => data),
      findAllByExecutionId: jest.fn(),
      findByExecutionAndId: jest.fn(),
    } as unknown as jest.Mocked<ExecutionArtifactsRepository>;

    const configService = {
      get: jest.fn().mockReturnValue({ mode: 'local', storageRoot }),
    } as unknown as ConfigService<import('@common/config').AllConfigType>;

    blobStore = new LocalArtifactBlobStore(configService);
    httpFetcher = jest.fn();
    service = new ArtifactMaterializerService(
      artifactsRepository,
      blobStore,
      httpFetcher,
    );
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('materializes inline text when context key exists', async () => {
    const execution = {
      ...baseExecution,
      contextJson: { emailDraft: 'Hello customer' },
      definitionSnapshot: {
        definition: {
          nodes: [],
          edges: [],
          variables: {},
          policies: {
            outputs: [
              {
                key: 'emailDraft',
                kind: 'text',
                label: 'Email',
                persist: 'inline',
              },
            ],
          },
        },
      },
    } as unknown as ExecutionEntity;

    await service.materializeForCompletedExecution(execution);

    expect(artifactsRepository.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'emailDraft',
        kind: ArtifactKind.TEXT,
        persist: ArtifactPersist.INLINE,
        status: ArtifactStatus.READY,
        contentJson: { text: 'Hello customer' },
      }),
    );
  });

  it('marks failed when context key is missing without throwing', async () => {
    const execution = {
      ...baseExecution,
      contextJson: {},
      definitionSnapshot: {
        definition: {
          nodes: [],
          edges: [],
          variables: {},
          policies: {
            outputs: [{ key: 'emailDraft', kind: 'text', persist: 'inline' }],
          },
        },
      },
    } as unknown as ExecutionEntity;

    await expect(service.materializeForCompletedExecution(execution)).resolves.toBeUndefined();

    expect(artifactsRepository.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'emailDraft',
        status: ArtifactStatus.FAILED,
        errorMessage: expect.stringContaining('missing'),
      }),
    );
  });

  it('skips when artifacts already exist (idempotent)', async () => {
    artifactsRepository.countByExecutionId.mockResolvedValue(2);
    await service.materializeForCompletedExecution(baseExecution);
    expect(artifactsRepository.createAndSave).not.toHaveBeenCalled();
  });

  it('materializes image_set blob items via http fetcher', async () => {
    httpFetcher.mockResolvedValue({
      buffer: Buffer.from('fake-png'),
      contentType: 'image/png',
    });

    const execution = {
      ...baseExecution,
      contextJson: {
        rawGenerations: [{ id: 'g1', assetUrl: 'https://cdn.example/a.png' }],
      },
      definitionSnapshot: {
        definition: {
          nodes: [],
          edges: [],
          variables: {},
          policies: {
            outputs: [
              {
                key: 'rawGenerations',
                kind: 'image_set',
                label: 'Generated looks',
                persist: 'blob',
              },
            ],
          },
        },
      },
    } as unknown as ExecutionEntity;

    await service.materializeForCompletedExecution(execution);

    expect(httpFetcher).toHaveBeenCalledWith('https://cdn.example/a.png');
    expect(artifactsRepository.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rawGenerations',
        kind: ArtifactKind.IMAGE_SET,
        status: ArtifactStatus.READY,
        contentJson: expect.objectContaining({
          items: [
            expect.objectContaining({
              storageKey: expect.stringContaining('executions/exec-1/'),
              contentType: 'image/png',
              byteSize: 8,
            }),
          ],
        }),
      }),
    );
  });

  it('marks image_set failed when all downloads fail', async () => {
    httpFetcher.mockRejectedValue(new Error('network down'));

    const execution = {
      ...baseExecution,
      contextJson: {
        rawGenerations: [{ assetUrl: 'https://cdn.example/a.png' }],
      },
      definitionSnapshot: {
        definition: {
          nodes: [],
          edges: [],
          variables: {},
          policies: {
            outputs: [
              { key: 'rawGenerations', kind: 'image_set', persist: 'blob' },
            ],
          },
        },
      },
    } as unknown as ExecutionEntity;

    await service.materializeForCompletedExecution(execution);

    expect(artifactsRepository.createAndSave).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ArtifactStatus.FAILED,
        errorMessage: expect.stringContaining('All image_set items failed'),
      }),
    );
  });

  it('no-ops when policies.outputs is absent', async () => {
    await service.materializeForCompletedExecution(baseExecution);
    expect(artifactsRepository.createAndSave).not.toHaveBeenCalled();
  });
});
