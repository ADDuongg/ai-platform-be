import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { PromptEntity } from '../entities/prompt.entity';
import { PromptVersionEntity } from '../entities/prompt-version.entity';
import { PromptStatus, PromptVersionStatus } from '../enums';
import { PromptsRepository } from '../repositories/prompts.repository';
import { PromptVersionsRepository } from '../repositories/prompt-versions.repository';
import { PromptsService } from './prompts.service';

describe('PromptsService', () => {
  let service: PromptsService;
  let promptsRepository: jest.Mocked<PromptsRepository>;
  let promptVersionsRepository: jest.Mocked<PromptVersionsRepository>;

  const adminPermissions = [
    PERMISSIONS.PROMPTS.READ,
    PERMISSIONS.PROMPTS.UPDATE,
    PERMISSIONS.PROMPTS.CREATE,
    PERMISSIONS.PROMPTS.PUBLISH,
  ];
  const readerPermissions = [PERMISSIONS.PROMPTS.READ];

  const draftPrompt = {
    id: 'prompt-1',
    code: 'test-prompt',
    name: 'Test Prompt',
    description: null,
    category: null,
    tags: [],
    status: PromptStatus.DRAFT,
    enabled: true,
    currentVersion: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as PromptEntity;

  const publishedPrompt = {
    ...draftPrompt,
    status: PromptStatus.PUBLISHED,
    currentVersion: 1,
  } as unknown as PromptEntity;

  const archivedPrompt = {
    ...draftPrompt,
    status: PromptStatus.ARCHIVED,
    deletedAt: new Date(),
  } as unknown as PromptEntity;

  const draftVersion = {
    id: 'ver-1',
    promptId: 'prompt-1',
    version: 1,
    status: PromptVersionStatus.DRAFT,
    template: 'Hello {{name}}',
    messages: null,
    variablesSchema: {},
    modelHints: {},
    changelog: null,
    publishedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as PromptVersionEntity;

  const publishedVersion = {
    ...draftVersion,
    status: PromptVersionStatus.PUBLISHED,
    publishedAt: new Date(),
  } as unknown as PromptVersionEntity;

  beforeEach(() => {
    promptsRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findManyFiltered: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      withTransaction: jest.fn(),
      createAndSave: jest.fn(),
    } as unknown as jest.Mocked<PromptsRepository>;

    promptVersionsRepository = {
      findDraftByPromptId: jest.fn(),
      findByPromptAndVersion: jest.fn(),
      findAllByPromptId: jest.fn(),
      getMaxVersion: jest.fn(),
      createAndSave: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<PromptVersionsRepository>;

    service = new PromptsService(promptsRepository, promptVersionsRepository);
  });

  describe('visibility', () => {
    it('lists only published prompts for readers', async () => {
      promptsRepository.findManyFiltered.mockResolvedValue([[publishedPrompt], 1]);

      await service.list({ page: 1, limit: 20 }, readerPermissions);

      expect(promptsRepository.findManyFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ includeDrafts: false }),
      );
    });

    it('hides draft prompts from readers on findById', async () => {
      promptsRepository.findById.mockResolvedValue(draftPrompt);

      await expect(service.findById('prompt-1', readerPermissions)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('allows admins to get draft prompts', async () => {
      promptsRepository.findById.mockResolvedValue(draftPrompt);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(draftVersion);

      const result = await service.findById('prompt-1', adminPermissions);
      expect(result.status).toBe(PromptStatus.DRAFT);
      expect(result.draftVersion).toBe(1);
    });

    it('hides draft prompts from readers on findByCode', async () => {
      promptsRepository.findByCode.mockResolvedValue(draftPrompt);

      await expect(service.findByCode('test-prompt', readerPermissions)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('create', () => {
    it('rejects duplicate active codes', async () => {
      promptsRepository.findByCode.mockResolvedValue(draftPrompt);

      await expect(
        service.create({ code: 'test-prompt', name: 'Test' }, 'user-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_CODE_EXISTS }),
      });
    });
  });

  describe('publish', () => {
    it('rejects publish when content is empty', async () => {
      const emptyDraft = { ...draftVersion, template: null, messages: null };
      promptsRepository.findById.mockResolvedValue(draftPrompt);
      promptsRepository.withTransaction.mockImplementation(async (work) => {
        const fakeManager = {
          getRepository: (entity: unknown) => {
            if (entity === PromptEntity) {
              return { findOne: jest.fn().mockResolvedValue(draftPrompt) };
            }
            return {
              findOne: jest.fn().mockResolvedValue(emptyDraft),
              save: jest.fn(),
            };
          },
        };
        return work(fakeManager as any);
      });

      await expect(service.publish('prompt-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_EMPTY_CONTENT }),
      });
    });

    it('rejects publish when no draft version exists', async () => {
      promptsRepository.findById.mockResolvedValue(publishedPrompt);
      promptsRepository.withTransaction.mockImplementation(async (work) => {
        const fakeManager = {
          getRepository: (entity: unknown) => {
            if (entity === PromptEntity) {
              return { findOne: jest.fn().mockResolvedValue(publishedPrompt) };
            }
            return { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
          },
        };
        return work(fakeManager as any);
      });

      await expect(service.publish('prompt-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NO_DRAFT_TO_PUBLISH }),
      });
    });
  });

  describe('update / immutability', () => {
    it('rejects content updates when no draft version exists', async () => {
      promptsRepository.findById.mockResolvedValue(publishedPrompt);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(null);

      await expect(service.update('prompt-1', { template: 'new content' })).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_VERSION_IMMUTABLE }),
      });
    });

    it('allows metadata updates without draft version', async () => {
      promptsRepository.findById.mockResolvedValue({ ...publishedPrompt });
      promptsRepository.save.mockImplementation(async (entity) => entity);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(null);

      const result = await service.update('prompt-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('createVersion', () => {
    it('rejects a second draft version', async () => {
      promptsRepository.findById.mockResolvedValue(publishedPrompt);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(draftVersion);

      await expect(service.createVersion('prompt-1', {}, 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_DRAFT_VERSION_EXISTS }),
      });
    });

    it('rejects creating version on non-published prompt', async () => {
      promptsRepository.findById.mockResolvedValue(draftPrompt);

      await expect(service.createVersion('prompt-1', {}, 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_INVALID_STATE }),
      });
    });
  });

  describe('assertAssignableByCode', () => {
    it('succeeds for published + enabled prompt', async () => {
      promptsRepository.findByCode.mockResolvedValue(publishedPrompt);
      const result = await service.assertAssignableByCode('test-prompt');
      expect(result.code).toBe('test-prompt');
    });

    it('rejects draft prompt', async () => {
      promptsRepository.findByCode.mockResolvedValue(draftPrompt);
      await expect(service.assertAssignableByCode('test-prompt')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });

    it('rejects disabled prompt', async () => {
      const disabled = { ...publishedPrompt, enabled: false };
      promptsRepository.findByCode.mockResolvedValue(disabled);
      await expect(service.assertAssignableByCode('test-prompt')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });

    it('rejects archived/deleted prompt', async () => {
      promptsRepository.findByCode.mockResolvedValue(null);
      await expect(service.assertAssignableByCode('unknown-code')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });

    it('rejects unknown code', async () => {
      promptsRepository.findByCode.mockResolvedValue(null);
      await expect(service.assertAssignableByCode('no-such-code')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });
  });

  describe('enable / disable / archive', () => {
    it('disables without changing published status', async () => {
      promptsRepository.findById.mockResolvedValue({ ...publishedPrompt });
      promptsRepository.save.mockImplementation(async (entity) => entity);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(null);

      const result = await service.disable('prompt-1');
      expect(result.enabled).toBe(false);
      expect(result.status).toBe(PromptStatus.PUBLISHED);
    });

    it('enables idempotently', async () => {
      promptsRepository.findById.mockResolvedValue({ ...publishedPrompt, enabled: true });
      promptsRepository.save.mockImplementation(async (entity) => entity);
      promptVersionsRepository.findDraftByPromptId.mockResolvedValue(null);

      const result = await service.enable('prompt-1');
      expect(result.enabled).toBe(true);
    });

    it('archives via soft delete', async () => {
      promptsRepository.findById.mockResolvedValue({ ...publishedPrompt });
      promptsRepository.save.mockResolvedValue({
        ...publishedPrompt,
        status: PromptStatus.ARCHIVED,
      });
      promptsRepository.softDelete.mockResolvedValue(undefined);

      const result = await service.softDelete('prompt-1');
      expect(result.message).toContain('archived');
      expect(promptsRepository.softDelete).toHaveBeenCalledWith('prompt-1');
    });

    it('rejects operations on archived prompts', async () => {
      promptsRepository.findById.mockResolvedValue(archivedPrompt);

      await expect(service.enable('prompt-1')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('canSeeDrafts', () => {
    it('uses prompts:update as admin catalog signal', () => {
      expect(service.canSeeDrafts(adminPermissions)).toBe(true);
      expect(service.canSeeDrafts(readerPermissions)).toBe(false);
    });
  });

  describe('AppException shape', () => {
    it('throws AppException instances', async () => {
      promptsRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing', adminPermissions)).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });
});
