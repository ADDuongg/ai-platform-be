import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { AgentEntity } from '../../agents/entities/agent.entity';
import { AgentsService } from '../../agents/services/agents.service';
import { WorkflowEntity } from '../entities/workflow.entity';
import { WorkflowVersionEntity } from '../entities/workflow-version.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '../enums';
import { WorkflowVersionsRepository } from '../repositories/workflow-versions.repository';
import { WorkflowsRepository } from '../repositories/workflows.repository';
import { WorkflowBuilderService } from './workflow-builder.service';
import { WorkflowDefinitionValidator } from './workflow-definition.validator';
import { EMPTY_WORKFLOW_DEFINITION, WorkflowsService } from './workflows.service';

describe('WorkflowBuilderService', () => {
  let service: WorkflowBuilderService;
  let workflowsRepository: jest.Mocked<WorkflowsRepository>;
  let workflowVersionsRepository: jest.Mocked<WorkflowVersionsRepository>;
  let workflowsService: jest.Mocked<Pick<WorkflowsService, 'findById' | 'canSeeDrafts'>>;
  let agentsService: jest.Mocked<Pick<AgentsService, 'assertAssignableByCode'>>;
  let validator: WorkflowDefinitionValidator;

  const designerPermissions = [PERMISSIONS.WORKFLOWS.READ, PERMISSIONS.WORKFLOWS.UPDATE];
  const readerPermissions = [PERMISSIONS.WORKFLOWS.READ];

  const draftWorkflow = {
    id: 'wf-1',
    code: 'demo-workflow',
    name: 'Demo',
    status: WorkflowStatus.DRAFT,
    currentVersion: null,
  } as unknown as WorkflowEntity;

  const publishedWorkflow = {
    ...draftWorkflow,
    status: WorkflowStatus.PUBLISHED,
    currentVersion: 1,
  } as unknown as WorkflowEntity;

  const makeDraft = (definition = { ...EMPTY_WORKFLOW_DEFINITION }) =>
    ({
      id: 'ver-1',
      workflowId: 'wf-1',
      version: 1,
      status: WorkflowVersionStatus.DRAFT,
      definitionJson: definition,
      changelog: null,
      publishedAt: null,
      createdBy: 'user-1',
    }) as unknown as WorkflowVersionEntity;

  const assignableAgent = {
    id: 'agent-1',
    code: 'research-agent',
  } as unknown as AgentEntity;

  beforeEach(() => {
    workflowsRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<WorkflowsRepository>;

    workflowVersionsRepository = {
      findDraftByWorkflowId: jest.fn(),
      findByWorkflowAndVersion: jest.fn(),
      save: jest.fn(async (version) => version),
    } as unknown as jest.Mocked<WorkflowVersionsRepository>;

    workflowsService = {
      findById: jest.fn(),
      canSeeDrafts: jest.fn((permissions: string[]) =>
        permissions.includes(PERMISSIONS.WORKFLOWS.UPDATE),
      ),
    };

    agentsService = {
      assertAssignableByCode: jest.fn().mockResolvedValue(assignableAgent),
    };

    validator = new WorkflowDefinitionValidator(agentsService as unknown as AgentsService);
    service = new WorkflowBuilderService(
      workflowsRepository,
      workflowVersionsRepository,
      workflowsService as unknown as WorkflowsService,
      validator,
    );
  });

  describe('addNode / removeNode', () => {
    it('adds a node for an assignable agent', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft();
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);

      const result = await service.addNode('wf-1', {
        id: 'n1',
        agentCode: 'research-agent',
        label: 'Research',
      });

      expect(result.definition.nodes).toHaveLength(1);
      expect(result.definition.nodes[0]).toMatchObject({
        id: 'n1',
        type: 'agent',
        agentCode: 'research-agent',
      });
      expect(agentsService.assertAssignableByCode).toHaveBeenCalledWith('research-agent');
    });

    it('rejects non-assignable agents', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(makeDraft());
      agentsService.assertAssignableByCode.mockRejectedValue(
        new AppException('not assignable', HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.WORKFLOW_INVALID_AGENT_REF,
        }),
      );

      await expect(service.addNode('wf-1', { agentCode: 'disabled-agent' })).rejects.toMatchObject({
        code: ERROR_CODES.WORKFLOW_INVALID_AGENT_REF,
      });
    });

    it('cascades edges when removing a node', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft({
        nodes: [
          { id: 'a', type: 'agent', agentCode: 'research-agent' },
          { id: 'b', type: 'agent', agentCode: 'research-agent' },
        ],
        edges: [{ id: 'e1', from: 'a', to: 'b', condition: null }],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);

      const result = await service.removeNode('wf-1', 'a');

      expect(result.definition.nodes).toHaveLength(1);
      expect(result.definition.edges).toHaveLength(0);
    });

    it('rejects mutate when no draft exists', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(null);

      await expect(service.addNode('wf-1', { agentCode: 'research-agent' })).rejects.toMatchObject({
        code: ERROR_CODES.WORKFLOW_NO_DRAFT_TO_PUBLISH,
      });
    });
  });

  describe('edges', () => {
    it('connects two nodes', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft({
        nodes: [
          { id: 'a', type: 'agent', agentCode: 'research-agent' },
          { id: 'b', type: 'agent', agentCode: 'research-agent' },
        ],
        edges: [],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);

      const result = await service.addEdge('wf-1', { id: 'e1', from: 'a', to: 'b' });

      expect(result.definition.edges).toEqual([
        expect.objectContaining({ id: 'e1', from: 'a', to: 'b' }),
      ]);
    });

    it('rejects cycles', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft({
        nodes: [
          { id: 'a', type: 'agent', agentCode: 'research-agent' },
          { id: 'b', type: 'agent', agentCode: 'research-agent' },
        ],
        edges: [{ id: 'e1', from: 'a', to: 'b', condition: null }],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);

      await expect(service.addEdge('wf-1', { from: 'b', to: 'a' })).rejects.toMatchObject({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
      });
    });

    it('rejects self-loops', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft({
        nodes: [{ id: 'a', type: 'agent', agentCode: 'research-agent' }],
        edges: [],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);

      await expect(service.addEdge('wf-1', { from: 'a', to: 'a' })).rejects.toMatchObject({
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
      });
    });
  });

  describe('replace / update / validate / visibility', () => {
    it('replaces agent on a node', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const draft = makeDraft({
        nodes: [{ id: 'a', type: 'agent', agentCode: 'research-agent', label: 'Keep' }],
        edges: [],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(draft);
      agentsService.assertAssignableByCode.mockResolvedValue({
        ...assignableAgent,
        code: 'review-agent',
      });

      const result = await service.updateNode('wf-1', 'a', { agentCode: 'review-agent' });

      expect(result.definition.nodes[0]).toMatchObject({
        id: 'a',
        agentCode: 'review-agent',
        label: 'Keep',
      });
    });

    it('rejects invalid full replace atomically', async () => {
      workflowsRepository.findById.mockResolvedValue(draftWorkflow);
      const original = makeDraft({
        nodes: [{ id: 'a', type: 'agent', agentCode: 'research-agent' }],
        edges: [],
        variables: {},
        policies: {},
      });
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(original);

      await expect(
        service.replaceDefinition('wf-1', {
          definition: {
            nodes: [
              { id: 'a', type: 'agent', agentCode: 'research-agent' },
              { id: 'b', type: 'agent', agentCode: 'research-agent' },
            ],
            edges: [
              { id: 'e1', from: 'a', to: 'b' },
              { id: 'e2', from: 'b', to: 'a' },
            ],
            variables: {},
            policies: {},
          },
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.WORKFLOW_INVALID_GRAPH });

      expect(original.definitionJson.nodes).toHaveLength(1);
      expect(workflowVersionsRepository.save).not.toHaveBeenCalled();
    });

    it('validates without persisting', async () => {
      workflowsService.findById.mockResolvedValue({
        id: 'wf-1',
        currentVersion: null,
      } as never);
      workflowVersionsRepository.findDraftByWorkflowId.mockResolvedValue(
        makeDraft({
          nodes: [{ id: 'a', type: 'agent', agentCode: 'research-agent' }],
          edges: [],
          variables: {},
          policies: {},
        }),
      );

      const result = await service.validateDefinition('wf-1', designerPermissions, {});

      expect(result.valid).toBe(true);
      expect(workflowVersionsRepository.save).not.toHaveBeenCalled();
    });

    it('hides draft definition from readers when published exists', async () => {
      workflowsService.findById.mockResolvedValue({
        id: 'wf-1',
        currentVersion: 1,
        status: WorkflowStatus.PUBLISHED,
      } as never);
      workflowsService.canSeeDrafts.mockReturnValue(false);
      workflowVersionsRepository.findByWorkflowAndVersion.mockResolvedValue({
        id: 'ver-pub',
        workflowId: 'wf-1',
        version: 1,
        status: WorkflowVersionStatus.PUBLISHED,
        definitionJson: {
          nodes: [{ id: 'published-node', type: 'agent', agentCode: 'research-agent' }],
          edges: [],
          variables: {},
          policies: {},
        },
      } as unknown as WorkflowVersionEntity);

      const result = await service.getDefinition('wf-1', readerPermissions);

      expect(result.versionStatus).toBe(WorkflowVersionStatus.PUBLISHED);
      expect(result.definition.nodes[0].id).toBe('published-node');
      expect(workflowVersionsRepository.findDraftByWorkflowId).not.toHaveBeenCalled();
    });
  });
});
