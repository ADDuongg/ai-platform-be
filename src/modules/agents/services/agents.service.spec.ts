import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { PromptsService } from '@modules/prompts/services/prompts.service';
import { ToolsService } from '@modules/tools/services/tools.service';

import { AgentEntity } from '../entities/agent.entity';
import { AgentVersionEntity } from '../entities/agent-version.entity';
import { AgentStatus, AgentVersionStatus, CapabilityType } from '../enums';
import { AgentVersionsRepository } from '../repositories/agent-versions.repository';
import { AgentsRepository } from '../repositories/agents.repository';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentsRepository: jest.Mocked<AgentsRepository>;
  let agentVersionsRepository: jest.Mocked<AgentVersionsRepository>;
  let promptsService: jest.Mocked<PromptsService>;
  let toolsService: jest.Mocked<ToolsService>;

  const adminPermissions = [
    PERMISSIONS.AGENTS.READ,
    PERMISSIONS.AGENTS.UPDATE,
    PERMISSIONS.AGENTS.CREATE,
  ];
  const readerPermissions = [PERMISSIONS.AGENTS.READ];

  const draftAgent = {
    id: 'agent-1',
    code: 'demo-agent',
    name: 'Demo',
    description: null,
    capabilityType: CapabilityType.CUSTOM,
    status: AgentStatus.DRAFT,
    enabled: true,
    currentVersion: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as AgentEntity;

  const publishedAgent = {
    ...draftAgent,
    status: AgentStatus.PUBLISHED,
    currentVersion: 1,
  } as unknown as AgentEntity;

  const draftVersion = {
    id: 'ver-1',
    agentId: 'agent-1',
    version: 1,
    status: AgentVersionStatus.DRAFT,
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    configJson: {},
    timeoutMs: 60_000,
    maxRetries: 0,
    promptRef: null,
    toolRefs: [],
    changelog: null,
    publishedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as AgentVersionEntity;

  beforeEach(() => {
    agentsRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findManyFiltered: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      withTransaction: jest.fn(),
      createAndSave: jest.fn(),
    } as unknown as jest.Mocked<AgentsRepository>;

    agentVersionsRepository = {
      findDraftByAgentId: jest.fn(),
      findByAgentAndVersion: jest.fn(),
      findAllByAgentId: jest.fn(),
      getMaxVersion: jest.fn(),
      createAndSave: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<AgentVersionsRepository>;

    promptsService = {
      assertAssignableByCode: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PromptsService>;

    toolsService = {
      assertAssignableByCodes: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ToolsService>;

    service = new AgentsService(
      agentsRepository,
      agentVersionsRepository,
      promptsService,
      toolsService,
    );
  });

  describe('visibility', () => {
    it('lists only published agents for readers', async () => {
      agentsRepository.findManyFiltered.mockResolvedValue([[publishedAgent], 1]);

      await service.list({ page: 1, limit: 20 }, readerPermissions);

      expect(agentsRepository.findManyFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ includeDrafts: false }),
      );
    });

    it('hides draft agents from readers on getById', async () => {
      agentsRepository.findById.mockResolvedValue(draftAgent);

      await expect(service.findById('agent-1', readerPermissions)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('allows admins to get draft agents', async () => {
      agentsRepository.findById.mockResolvedValue(draftAgent);
      agentVersionsRepository.findDraftByAgentId.mockResolvedValue(draftVersion);

      const result = await service.findById('agent-1', adminPermissions);
      expect(result.status).toBe(AgentStatus.DRAFT);
      expect(result.draftVersion).toBe(1);
    });
  });

  describe('create', () => {
    it('rejects duplicate codes', async () => {
      agentsRepository.findByCode.mockResolvedValue(draftAgent);

      await expect(
        service.create(
          {
            code: 'demo-agent',
            name: 'Demo',
            capabilityType: CapabilityType.CUSTOM,
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
          },
          'user-1',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.AGENT_CODE_EXISTS }),
      });
    });
  });

  describe('update / immutability', () => {
    it('rejects config updates when no draft version exists', async () => {
      agentsRepository.findById.mockResolvedValue(publishedAgent);
      agentVersionsRepository.findDraftByAgentId.mockResolvedValue(null);

      await expect(
        service.update('agent-1', { inputSchema: { type: 'object', properties: {} } }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.AGENT_NO_DRAFT_TO_PUBLISH }),
      });
    });
  });

  describe('createVersion', () => {
    it('rejects a second draft version', async () => {
      agentsRepository.findById.mockResolvedValue(publishedAgent);
      agentVersionsRepository.findDraftByAgentId.mockResolvedValue(draftVersion);

      await expect(service.createVersion('agent-1', {}, 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.AGENT_DRAFT_VERSION_EXISTS }),
      });
    });
  });

  describe('enable / archive', () => {
    it('disables without changing published status', async () => {
      agentsRepository.findById.mockResolvedValue({ ...publishedAgent });
      agentsRepository.save.mockImplementation(async (entity) => entity);
      agentVersionsRepository.findDraftByAgentId.mockResolvedValue(null);

      const result = await service.disable('agent-1');
      expect(result.enabled).toBe(false);
      expect(result.status).toBe(AgentStatus.PUBLISHED);
    });

    it('archives via soft delete', async () => {
      agentsRepository.findById.mockResolvedValue({ ...publishedAgent });
      agentsRepository.save.mockResolvedValue({
        ...publishedAgent,
        status: AgentStatus.ARCHIVED,
      });
      agentsRepository.softDelete.mockResolvedValue(undefined);

      const result = await service.softDelete('agent-1');
      expect(result.message).toContain('archived');
      expect(agentsRepository.softDelete).toHaveBeenCalledWith('agent-1');
    });
  });

  describe('canSeeDrafts', () => {
    it('uses agents:update as admin catalog signal', () => {
      expect(service.canSeeDrafts(adminPermissions)).toBe(true);
      expect(service.canSeeDrafts(readerPermissions)).toBe(false);
    });
  });

  describe('promptRef validation', () => {
    it('validates promptRef on create when non-empty', async () => {
      agentsRepository.findByCode.mockResolvedValue(null);
      promptsService.assertAssignableByCode.mockRejectedValue(
        new AppException('Prompt is not assignable (not found)', HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE,
        }),
      );

      await expect(
        service.create(
          {
            code: 'new-agent',
            name: 'New',
            capabilityType: CapabilityType.CUSTOM,
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            promptRef: 'invalid-prompt',
          },
          'user-1',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });

    it('allows null promptRef on create', async () => {
      agentsRepository.findByCode.mockResolvedValue(null);
      agentsRepository.withTransaction.mockImplementation(async (work) => {
        const fakeRepo = {
          create: (data: any) => data,
          save: async (data: any) => ({
            id: 'new-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        };
        const fakeManager = { getRepository: () => fakeRepo };
        return work(fakeManager as any);
      });

      await expect(
        service.create(
          {
            code: 'new-agent',
            name: 'New',
            capabilityType: CapabilityType.CUSTOM,
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            promptRef: null,
          },
          'user-1',
        ),
      ).resolves.toBeDefined();

      expect(promptsService.assertAssignableByCode).not.toHaveBeenCalled();
    });

    it('validates promptRef on update when non-empty', async () => {
      agentsRepository.findById.mockResolvedValue(publishedAgent);
      agentVersionsRepository.findDraftByAgentId.mockResolvedValue(draftVersion);
      promptsService.assertAssignableByCode.mockRejectedValue(
        new AppException('Prompt is not assignable (not found)', HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE,
        }),
      );

      await expect(service.update('agent-1', { promptRef: 'bad-ref' })).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE }),
      });
    });
  });

  describe('toolRefs validation', () => {
    it('validates toolRefs on create when non-empty', async () => {
      agentsRepository.findByCode.mockResolvedValue(null);
      toolsService.assertAssignableByCodes.mockRejectedValue(
        new AppException('Tool is not assignable (not found)', HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.TOOL_NOT_ASSIGNABLE,
        }),
      );

      await expect(
        service.create(
          {
            code: 'new-agent',
            name: 'New',
            capabilityType: CapabilityType.CUSTOM,
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            toolRefs: ['bad-tool'],
          },
          'user-1',
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.TOOL_NOT_ASSIGNABLE }),
      });
    });

    it('allows empty toolRefs on create', async () => {
      agentsRepository.findByCode.mockResolvedValue(null);
      agentsRepository.withTransaction.mockImplementation(async (work) => {
        const fakeRepo = {
          create: (data: any) => data,
          save: async (data: any) => ({
            id: 'new-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        };
        const fakeManager = { getRepository: () => fakeRepo };
        return work(fakeManager as any);
      });

      await expect(
        service.create(
          {
            code: 'new-agent-2',
            name: 'New',
            capabilityType: CapabilityType.CUSTOM,
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            toolRefs: [],
          },
          'user-1',
        ),
      ).resolves.toBeDefined();

      expect(toolsService.assertAssignableByCodes).not.toHaveBeenCalled();
    });
  });

  describe('AppException shape', () => {
    it('throws AppException instances', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing', adminPermissions)).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });
});
