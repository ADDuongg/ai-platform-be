import { HttpStatus } from '@nestjs/common';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';
import { WorkflowStatus, WorkflowVersionStatus } from '@modules/workflows/enums';
import { EMPTY_WORKFLOW_DEFINITION } from '@modules/workflows/services/workflows.service';

import { ExecutionStatus, ExecutionStepStatus } from '../enums';
import { ExecutionsService } from './executions.service';

describe('ExecutionsService', () => {
  let service: ExecutionsService;
  let executionsRepository: Record<string, jest.Mock>;
  let executionStepsRepository: Record<string, jest.Mock>;
  let workflowsRepository: Record<string, jest.Mock>;
  let workflowVersionsRepository: Record<string, jest.Mock>;
  let definitionValidator: Record<string, jest.Mock>;
  let agentsService: Record<string, jest.Mock>;
  let agentsRepository: Record<string, jest.Mock>;
  let agentVersionsRepository: Record<string, jest.Mock>;
  let executionQueue: { add: jest.Mock };

  const publishedWorkflow = {
    id: 'wf-1',
    code: 'sample',
    status: WorkflowStatus.PUBLISHED,
    currentVersion: 1,
  };

  const publishedVersion = {
    id: 'ver-1',
    workflowId: 'wf-1',
    version: 1,
    status: WorkflowVersionStatus.PUBLISHED,
    definitionJson: {
      ...EMPTY_WORKFLOW_DEFINITION,
      nodes: [{ id: 'n1', type: 'agent', agentCode: 'research-agent', maxRetries: 0 }],
      edges: [],
    },
  };

  const emptyVersion = {
    ...publishedVersion,
    definitionJson: { ...EMPTY_WORKFLOW_DEFINITION, nodes: [], edges: [] },
  };

  beforeEach(() => {
    executionsRepository = {
      createAndSave: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      findManyFiltered: jest.fn(),
    };
    executionStepsRepository = {
      createAndSave: jest.fn(),
      findByExecutionId: jest.fn(),
      findByExecutionAndId: jest.fn(),
      cancelPendingSteps: jest.fn(),
      save: jest.fn(),
    };
    workflowsRepository = {
      findById: jest.fn(),
    };
    workflowVersionsRepository = {
      findByWorkflowAndVersion: jest.fn(),
    };
    definitionValidator = {
      validate: jest.fn(),
      cloneDefinition: jest.fn((d) => structuredClone(d)),
    };
    agentsService = {
      assertAssignableByCode: jest.fn().mockResolvedValue({
        id: 'ag-1',
        code: 'research-agent',
        currentVersion: 1,
      }),
    };
    agentsRepository = {
      findByCode: jest.fn().mockResolvedValue({
        id: 'ag-1',
        code: 'research-agent',
        status: 'published',
      }),
    };
    agentVersionsRepository = {
      findByAgentAndVersion: jest.fn().mockResolvedValue({
        version: 1,
        status: 'published',
        maxRetries: 0,
      }),
    };
    executionQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new ExecutionsService(
      executionsRepository as never,
      executionStepsRepository as never,
      workflowsRepository as never,
      workflowVersionsRepository as never,
      definitionValidator as never,
      agentsService as never,
      agentsRepository as never,
      agentVersionsRepository as never,
      executionQueue as never,
    );
  });

  describe('start', () => {
    it('rejects draft/unpublished workflows', async () => {
      workflowsRepository.findById.mockResolvedValue({
        ...publishedWorkflow,
        status: WorkflowStatus.DRAFT,
      });

      await expect(
        service.startFromWorkflow('wf-1', { input: {} }, 'user-1'),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: expect.objectContaining({ code: ERROR_CODES.WORKFLOW_NOT_FOUND }),
      });
    });

    it('completes immediately for empty graph', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findByWorkflowAndVersion.mockResolvedValue(emptyVersion);
      definitionValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        definition: emptyVersion.definitionJson,
      });
      executionsRepository.createAndSave.mockImplementation(async (data) => ({
        id: 'ex-empty',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }));

      const result = await service.startFromWorkflow('wf-1', { input: { topic: 'x' } }, 'user-1');

      expect(result.status).toBe(ExecutionStatus.COMPLETED);
      expect(executionQueue.add).not.toHaveBeenCalled();
      expect(executionStepsRepository.createAndSave).not.toHaveBeenCalled();
    });

    it('creates pending execution and enqueues job', async () => {
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findByWorkflowAndVersion.mockResolvedValue(publishedVersion);
      definitionValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        definition: publishedVersion.definitionJson,
      });
      executionsRepository.createAndSave.mockImplementation(async (data) => ({
        id: 'ex-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }));
      executionStepsRepository.createAndSave.mockImplementation(async (data) => ({
        id: 'st-1',
        ...data,
      }));

      const result = await service.startFromWorkflow(
        'wf-1',
        { input: { topic: 'kids' } },
        'user-1',
      );

      expect(result.status).toBe(ExecutionStatus.PENDING);
      expect(executionStepsRepository.createAndSave).toHaveBeenCalled();
      expect(executionQueue.add).toHaveBeenCalled();
    });

    it('rejects start when requiredInputs are missing or blank', async () => {
      const definition = {
        ...EMPTY_WORKFLOW_DEFINITION,
        nodes: [{ id: 'n1', type: 'agent' as const, agentCode: 'fashion-trend-research' }],
        edges: [],
        policies: { requiredInputs: ['season', 'category', 'market'] },
      };
      workflowsRepository.findById.mockResolvedValue(publishedWorkflow);
      workflowVersionsRepository.findByWorkflowAndVersion.mockResolvedValue({
        ...publishedVersion,
        definitionJson: definition,
      });
      definitionValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        definition,
      });

      await expect(
        service.startFromWorkflow('wf-1', { input: { season: 'SS27', category: '  ' } }, 'user-1'),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: expect.objectContaining({
          code: ERROR_CODES.VALIDATION_ERROR,
          details: expect.objectContaining({
            missing: ['market'],
            blank: ['category'],
          }),
        }),
      });

      expect(executionsRepository.createAndSave).not.toHaveBeenCalled();
      expect(executionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels pending execution', async () => {
      const execution = {
        id: 'ex-1',
        status: ExecutionStatus.PENDING,
        workflowId: 'wf-1',
        workflowCode: 'sample',
        workflowVersion: 1,
        inputJson: {},
        contextJson: {},
        errorJson: null,
        startedBy: 'user-1',
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executionsRepository.findById.mockResolvedValue(execution);
      executionsRepository.save.mockImplementation(async (e) => e);

      const result = await service.cancel('ex-1');
      expect(result.status).toBe(ExecutionStatus.CANCELLED);
      expect(executionStepsRepository.cancelPendingSteps).toHaveBeenCalledWith('ex-1');
    });

    it('rejects cancel on completed', async () => {
      executionsRepository.findById.mockResolvedValue({
        id: 'ex-1',
        status: ExecutionStatus.COMPLETED,
      });

      await expect(service.cancel('ex-1')).rejects.toBeInstanceOf(AppException);
      await expect(service.cancel('ex-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.EXECUTION_NOT_CANCELLABLE }),
      });
    });
  });

  describe('retry', () => {
    it('rejects retry when not failed', async () => {
      executionsRepository.findById.mockResolvedValue({
        id: 'ex-1',
        status: ExecutionStatus.COMPLETED,
      });

      await expect(service.retry('ex-1')).rejects.toMatchObject({
        response: expect.objectContaining({ code: ERROR_CODES.EXECUTION_NOT_RETRYABLE }),
      });
    });

    it('requeues failed steps without touching completed', async () => {
      const execution = {
        id: 'ex-1',
        status: ExecutionStatus.FAILED,
        workflowId: 'wf-1',
        workflowCode: 'sample',
        workflowVersion: 1,
        inputJson: {},
        contextJson: { research: 'ok' },
        errorJson: { message: 'fail' },
        startedBy: 'user-1',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        definitionSnapshot: { definition: publishedVersion.definitionJson, agentPins: [] },
      };
      const completed = {
        id: 'st-1',
        executionId: 'ex-1',
        nodeId: 'n0',
        agentCode: 'research-agent',
        agentVersion: 1,
        status: ExecutionStepStatus.COMPLETED,
        attempt: 1,
        maxRetries: 0,
      };
      const failed = {
        id: 'st-2',
        executionId: 'ex-1',
        nodeId: 'n1',
        agentCode: 'research-agent',
        agentVersion: 1,
        status: ExecutionStepStatus.FAILED,
        attempt: 1,
        maxRetries: 0,
        errorJson: { message: 'boom' },
      };

      executionsRepository.findById.mockResolvedValue(execution);
      executionStepsRepository.findByExecutionId.mockResolvedValue([completed, failed]);
      executionStepsRepository.save.mockImplementation(async (s) => s);
      executionsRepository.save.mockImplementation(async (e) => e);

      const result = await service.retry('ex-1');

      expect(result.status).toBe(ExecutionStatus.PENDING);
      expect(executionStepsRepository.save).toHaveBeenCalledTimes(1);
      expect(failed.status).toBe(ExecutionStepStatus.PENDING);
      expect(completed.status).toBe(ExecutionStepStatus.COMPLETED);
      expect(executionQueue.add).toHaveBeenCalled();
    });
  });
});
