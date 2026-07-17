import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { WorkflowEntity } from '../entities/workflow.entity';
import { WorkflowVersionEntity } from '../entities/workflow-version.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '../enums';
import { WorkflowVersionsRepository } from '../repositories/workflow-versions.repository';
import { WorkflowsRepository } from '../repositories/workflows.repository';
import { EMPTY_WORKFLOW_DEFINITION, WorkflowsService } from './workflows.service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let workflowsRepository: jest.Mocked<WorkflowsRepository>;
  let workflowVersionsRepository: jest.Mocked<WorkflowVersionsRepository>;

  const designerPermissions = [
    PERMISSIONS.WORKFLOWS.READ,
    PERMISSIONS.WORKFLOWS.UPDATE,
    PERMISSIONS.WORKFLOWS.CREATE,
    PERMISSIONS.WORKFLOWS.PUBLISH,
  ];
  const readerPermissions = [PERMISSIONS.WORKFLOWS.READ];

  const draftWorkflow = {
    id: 'wf-1',
    code: 'demo-workflow',
    name: 'Demo',
    description: null,
    category: null,
    tags: [],
    status: WorkflowStatus.DRAFT,
    currentVersion: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as WorkflowEntity;

  const publishedWorkflow = {
    ...draftWorkflow,
    status: WorkflowStatus.PUBLISHED,
    currentVersion: 1,
  } as unknown as WorkflowEntity;

  const draftVersion = {
    id: 'ver-1',
    workflowId: 'wf-1',
    version: 1,
    status: WorkflowVersionStatus.DRAFT,
    definitionJson: { ...EMPTY_WORKFLOW_DEFINITION },
    changelog: null,
    publishedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as WorkflowVersionEntity;

  const publishedVersion = {
    ...draftVersion,
    status: WorkflowVersionStatus.PUBLISHED,
    publishedAt: new Date(),
  } as unknown as WorkflowVersionEntity;

  beforeEach(() => {
    workflowsRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findManyFiltered: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      withTransaction: jest.fn(),
      createAndSave: jest.fn(),
    } as unknown as jest.Mocked<WorkflowsRepository>;

    workflowVersionsRepository = {
      findDraftByWorkflowId: jest.fn(),
      findByWorkflowAndVersion: jest.fn(),
      findAllByWorkflowId: jest.fn(),
      getMaxVersion: jest.fn(),
      createAndSave: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<WorkflowVersionsRepository>;

    service = new WorkflowsService(workflowsRepository, workflowVersionsRepository);
  });

  describe('visibility', () => {
    it('lists only published workflows for readers', async () => {
      workflowsRepository.findManyFiltered.mockResolvedValue([[publishedWorkflow], 1]);

      await service.list({ page: 1, limit: 20 }, readerPermissions);

      expect(workflowsRepository.findManyFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ includeDrafts: false }),
      );
    });

    it('hides draft workflows from readers on getById', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);

      await expect(service.findById('wf-1', readerPermissions)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('allows designers to get draft workflows', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draftVersion);

      const result = await service.findById('wf-1', designerPermissions);
      expect(result.status).toBe(WorkflowStatus.DRAFT);
      expect(result.draftVersion).toBe(1);
    });
  });

  describe('create', () => {
    it('rejects duplicate codes', async () => {
      workflowsRepository.findByCode.mockResolvedValue(draftWorkflow);

      await expect(
        service.create({ code: 'demo-workflow', name: 'Demo' }, 'user-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.WORKFLOW_CODE_EXISTS }),
      });
    });

    it('allows create when findByCode finds no active row (archived code freed)', async () => {
      workflowsRepository.findByCode.mockResolvedValue(null);
      workflowsRepository.withTransaction.mockImplementation(async (fn) => {
        const workflowRepo = {
          create: jest.fn((value) => value),
          save: jest.fn(async (value) => ({ ...draftWorkflow, ...value, id: 'wf-new' })),
        };
        const versionRepo = {
          create: jest.fn((value) => value),
          save: jest.fn(async (value) => value),
        };
        return fn({
          getRepository: (entity: unknown) =>
            entity === WorkflowEntity ? workflowRepo : versionRepo,
        } as never);
      });

      const result = await service.create({ code: 'test', name: 'test' }, 'user-1');
      expect(result.code).toBe('test');
      expect(workflowsRepository.findByCode).toHaveBeenCalledWith('test');
    });
  });

  describe('update / immutability', () => {
    it('rejects definition updates when no draft version exists', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(null);

      await expect(
        service.update('wf-1', { definition: { nodes: [], edges: [] } }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.WORKFLOW_NO_DRAFT_TO_PUBLISH }),
      });
    });
  });

  describe('createVersion', () => {
    it('rejects a second draft version', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draftVersion);

      await expect(service.createVersion('wf-1', {}, 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.WORKFLOW_DRAFT_VERSION_EXISTS }),
      });
    });
  });

  describe('clone', () => {
    it('rejects clone when new code already exists', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findByWorkflowAndVersion.mockResolvedValue(publishedVersion);
      workflowsRepository.findByCode.mockResolvedValue(draftWorkflow);

      await expect(
        service.clone('wf-1', { code: 'taken-code' }, 'user-1', designerPermissions),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.WORKFLOW_CODE_EXISTS }),
      });
    });
  });

  describe('archive', () => {
    it('archives via soft delete', async () => {
      workflowsRepository.findById.mockResolvedValue({ ...publishedWorkflow });
      workflowsRepository.save.mockResolvedValue({
        ...publishedWorkflow,
        status: WorkflowStatus.ARCHIVED,
      });
      workflowsRepository.softDelete.mockResolvedValue(undefined);

      const result = await service.softDelete('wf-1');
      expect(result.message).toContain('archived');
      expect(workflowsRepository.softDelete).toHaveBeenCalledWith('wf-1');
    });
  });

  describe('canSeeDrafts', () => {
    it('uses workflows:update as mutate catalog signal', () => {
      expect(service.canSeeDrafts(designerPermissions)).toBe(true);
      expect(service.canSeeDrafts(readerPermissions)).toBe(false);
    });
  });

  describe('AppException shape', () => {
    it('throws AppException instances', async () => {
      workflowsRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing', designerPermissions)).rejects.toBeInstanceOf(
        AppException,
      );
    });
  });
});
