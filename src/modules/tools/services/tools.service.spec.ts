import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { ToolEntity } from '../entities/tool.entity';
import { ToolVersionEntity } from '../entities/tool-version.entity';
import { ToolStatus, ToolType, ToolVersionStatus } from '../enums';
import { ToolVersionsRepository } from '../repositories/tool-versions.repository';
import { ToolsRepository } from '../repositories/tools.repository';
import { ToolsService } from './tools.service';

describe('ToolsService', () => {
  let service: ToolsService;
  let toolsRepository: jest.Mocked<ToolsRepository>;
  let toolVersionsRepository: jest.Mocked<ToolVersionsRepository>;

  const adminPermissions = [
    PERMISSIONS.TOOLS.READ,
    PERMISSIONS.TOOLS.UPDATE,
    PERMISSIONS.TOOLS.CREATE,
    PERMISSIONS.TOOLS.PUBLISH,
  ];
  const readerPermissions = [PERMISSIONS.TOOLS.READ];

  const draftTool = {
    id: 'tool-1',
    code: 'test-tool',
    name: 'Test Tool',
    description: null,
    toolType: ToolType.HTTP,
    status: ToolStatus.DRAFT,
    enabled: true,
    currentVersion: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as ToolEntity;

  const publishedTool = {
    ...draftTool,
    status: ToolStatus.PUBLISHED,
    currentVersion: 1,
  } as unknown as ToolEntity;

  const archivedTool = {
    ...draftTool,
    status: ToolStatus.ARCHIVED,
    deletedAt: new Date(),
  } as unknown as ToolEntity;

  const draftVersion = {
    id: 'ver-1',
    toolId: 'tool-1',
    version: 1,
    status: ToolVersionStatus.DRAFT,
    configJson: {},
    inputSchema: {},
    outputSchema: {},
    secretRef: null,
    timeoutMs: null,
    maxRetries: null,
    changelog: null,
    publishedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as ToolVersionEntity;

  beforeEach(() => {
    toolsRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findManyFiltered: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      withTransaction: jest.fn(),
      createAndSave: jest.fn(),
    } as unknown as jest.Mocked<ToolsRepository>;

    toolVersionsRepository = {
      findDraftByToolId: jest.fn(),
      findByToolAndVersion: jest.fn(),
      findAllByToolId: jest.fn(),
      getMaxVersion: jest.fn(),
      createAndSave: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ToolVersionsRepository>;

    service = new ToolsService(toolsRepository, toolVersionsRepository);
  });

  describe('visibility', () => {
    it('lists only published tools for readers', async () => {
      toolsRepository.findManyFiltered.mockResolvedValue([[publishedTool], 1]);

      await service.list({ page: 1, limit: 20 }, readerPermissions);

      expect(toolsRepository.findManyFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ includeDrafts: false }),
      );
    });

    it('hides draft tools from readers on findById', async () => {
      toolsRepository.findById.mockResolvedValue(draftTool);

      await expect(service.findById('tool-1', readerPermissions)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('allows admins to get draft tools', async () => {
      toolsRepository.findById.mockResolvedValue(draftTool);
      toolVersionsRepository.findDraftByToolId.mockResolvedValue(draftVersion);

      const result = await service.findById('tool-1', adminPermissions);
      expect(result.status).toBe(ToolStatus.DRAFT);
    });
  });

  describe('secret rejection', () => {
    it('rejects create with plaintext apiKey in config', async () => {
      toolsRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.create(
          {
            code: 'secret-tool',
            name: 'Secret',
            toolType: ToolType.HTTP,
            config: { apiKey: 'sk-live' },
          },
          'user-1',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_SECRET_IN_CONFIG }),
      });
    });
  });

  describe('update / immutability', () => {
    it('rejects config update when no draft version', async () => {
      toolsRepository.findById.mockResolvedValue({ ...publishedTool });
      toolVersionsRepository.findDraftByToolId.mockResolvedValue(null);

      await expect(
        service.update('tool-1', { config: { endpoint: 'https://x' } }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_VERSION_IMMUTABLE }),
      });
    });
  });

  describe('createVersion', () => {
    it('rejects a second draft version', async () => {
      toolsRepository.findById.mockResolvedValue(publishedTool);
      toolVersionsRepository.findDraftByToolId.mockResolvedValue(draftVersion);

      await expect(service.createVersion('tool-1', {}, 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_DRAFT_VERSION_EXISTS }),
      });
    });
  });

  describe('assertAssignableByCodes', () => {
    it('succeeds for published + enabled tools', async () => {
      toolsRepository.findByCode.mockResolvedValue(publishedTool);
      await expect(service.assertAssignableByCodes(['test-tool'])).resolves.toBeUndefined();
    });

    it('rejects draft tool', async () => {
      toolsRepository.findByCode.mockResolvedValue(draftTool);
      await expect(service.assertAssignableByCodes(['test-tool'])).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_NOT_ASSIGNABLE }),
      });
    });

    it('rejects duplicates', async () => {
      await expect(
        service.assertAssignableByCodes(['test-tool', 'test-tool']),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_REFS_INVALID }),
      });
    });

    it('rejects more than 20 codes', async () => {
      const codes = Array.from({ length: 21 }, (_, i) => `tool-${i}`);
      await expect(service.assertAssignableByCodes(codes)).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_REFS_INVALID }),
      });
    });
  });

  describe('enable / disable / archive', () => {
    it('disables without changing published status', async () => {
      toolsRepository.findById.mockResolvedValue({ ...publishedTool });
      toolsRepository.save.mockImplementation(async (entity) => entity);
      toolVersionsRepository.findDraftByToolId.mockResolvedValue(null);

      const result = await service.disable('tool-1');
      expect(result.enabled).toBe(false);
      expect(result.status).toBe(ToolStatus.PUBLISHED);
    });

    it('archives via soft delete', async () => {
      toolsRepository.findById.mockResolvedValue({ ...publishedTool });
      toolsRepository.save.mockResolvedValue({
        ...publishedTool,
        status: ToolStatus.ARCHIVED,
      });
      toolsRepository.softDelete.mockResolvedValue(undefined);

      const result = await service.softDelete('tool-1');
      expect(result.message).toContain('archived');
      expect(toolsRepository.softDelete).toHaveBeenCalledWith('tool-1');
    });

    it('rejects operations on archived tools', async () => {
      toolsRepository.findById.mockResolvedValue(archivedTool);

      await expect(service.enable('tool-1')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('canSeeDrafts', () => {
    it('uses tools:update as admin catalog signal', () => {
      expect(service.canSeeDrafts(adminPermissions)).toBe(true);
      expect(service.canSeeDrafts(readerPermissions)).toBe(false);
    });
  });

  describe('AppException shape', () => {
    it('throws AppException instances', async () => {
      toolsRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing', adminPermissions)).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });
});
