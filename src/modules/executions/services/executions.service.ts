import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { plainToInstance } from 'class-transformer';
import { Queue } from 'bullmq';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';
import { jsonPayloadByteSize } from '@common/utils';
import { AuditAction, AuditDomain } from '@modules/audit/constants/audit.constants';
import { AuditLogService } from '@modules/audit/services/audit-log.service';
import { AgentsService } from '@modules/agents/services/agents.service';
import { AgentVersionsRepository } from '@modules/agents/repositories/agent-versions.repository';
import { AgentsRepository } from '@modules/agents/repositories/agents.repository';
import { AgentStatus, AgentVersionStatus } from '@modules/agents/enums';
import { WorkflowStatus, WorkflowVersionStatus } from '@modules/workflows/enums';
import { WorkflowsRepository } from '@modules/workflows/repositories/workflows.repository';
import { WorkflowVersionsRepository } from '@modules/workflows/repositories/workflow-versions.repository';
import { WorkflowDefinitionValidator } from '@modules/workflows/services/workflow-definition.validator';
import type { WorkflowDefinition } from '@modules/workflows/types';

import {
  EXECUTION_JOB_RUN,
  EXECUTION_QUEUE,
  MAX_EXECUTION_INPUT_BYTES,
} from '../constants/executions.constants';
import { CreateExecutionDto, ExecuteWorkflowDto } from '../dto/execute-workflow.dto';
import { ExecutionResponseDto } from '../dto/execution-response.dto';
import { ExecutionStepResponseDto } from '../dto/execution-step-response.dto';
import { ListExecutionsQueryDto } from '../dto/list-executions-query.dto';
import { ExecutionEntity } from '../entities/execution.entity';
import { ExecutionStepEntity } from '../entities/execution-step.entity';
import { ExecutionStatus, ExecutionStepStatus } from '../enums';
import { ExecutionStepsRepository } from '../repositories/execution-steps.repository';
import { ExecutionsRepository } from '../repositories/executions.repository';
import type { AgentPin, DefinitionSnapshot } from '../types';
import { assertRequiredInputs } from './required-inputs';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    private readonly executionsRepository: ExecutionsRepository,
    private readonly executionStepsRepository: ExecutionStepsRepository,
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowVersionsRepository: WorkflowVersionsRepository,
    private readonly definitionValidator: WorkflowDefinitionValidator,
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly agentVersionsRepository: AgentVersionsRepository,
    @InjectQueue(EXECUTION_QUEUE) private readonly executionQueue: Queue,
    private readonly auditLogService: AuditLogService,
  ) {}

  async startFromWorkflow(
    workflowId: string,
    dto: ExecuteWorkflowDto,
    startedBy: string,
  ): Promise<ExecutionResponseDto> {
    return this.start(workflowId, dto.version ?? null, dto.input ?? {}, startedBy);
  }

  async startFromBody(dto: CreateExecutionDto, startedBy: string): Promise<ExecutionResponseDto> {
    return this.start(dto.workflowId, dto.version ?? null, dto.input ?? {}, startedBy);
  }

  async list(
    query: ListExecutionsQueryDto,
  ): Promise<{ data: ExecutionResponseDto[]; meta: Record<string, number> }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [rows, total] = await this.executionsRepository.findManyFiltered({
      workflowId: query.workflowId,
      status: query.status,
      startedBy: query.startedBy,
      page,
      limit,
    });
    return {
      data: rows.map((row) => this.toExecutionDto(row)),
      meta: { page, limit, total },
    };
  }

  async findById(id: string): Promise<ExecutionResponseDto> {
    const execution = await this.requireExecution(id);
    return this.toExecutionDto(execution);
  }

  async listSteps(executionId: string): Promise<ExecutionStepResponseDto[]> {
    await this.requireExecution(executionId);
    const steps = await this.executionStepsRepository.findByExecutionId(executionId);
    return steps.map((step) => this.toStepDto(step));
  }

  async getStep(executionId: string, stepId: string): Promise<ExecutionStepResponseDto> {
    await this.requireExecution(executionId);
    const step = await this.executionStepsRepository.findByExecutionAndId(executionId, stepId);
    if (!step) {
      throw new AppException('Execution step not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXECUTION_NOT_FOUND,
      });
    }
    return this.toStepDto(step);
  }

  async cancel(id: string, actorId?: string): Promise<ExecutionResponseDto> {
    const execution = await this.requireExecution(id);
    if (
      execution.status !== ExecutionStatus.PENDING &&
      execution.status !== ExecutionStatus.RUNNING
    ) {
      throw new AppException('Execution cannot be cancelled', HttpStatus.CONFLICT, {
        code: ERROR_CODES.EXECUTION_NOT_CANCELLABLE,
        details: { status: execution.status },
      });
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.completedAt = new Date();
    await this.executionsRepository.save(execution);
    await this.executionStepsRepository.cancelPendingSteps(id);

    await this.auditLogService.record({
      domain: AuditDomain.EXECUTION,
      action: AuditAction.EXECUTION_CANCELLED,
      resourceType: 'execution',
      resourceId: execution.id,
      resourceCode: execution.workflowCode ?? null,
      actorUserId: actorId ?? null,
      metadata: { workflowId: execution.workflowId, workflowVersion: execution.workflowVersion },
    });

    return this.toExecutionDto(execution);
  }

  async retry(id: string, actorId?: string): Promise<ExecutionResponseDto> {
    const execution = await this.requireExecution(id);
    if (execution.status !== ExecutionStatus.FAILED) {
      throw new AppException('Only failed executions can be retried', HttpStatus.CONFLICT, {
        code: ERROR_CODES.EXECUTION_NOT_RETRYABLE,
        details: { status: execution.status },
      });
    }

    const steps = await this.executionStepsRepository.findByExecutionId(id);
    const failedSteps = steps.filter((step) => step.status === ExecutionStepStatus.FAILED);
    if (failedSteps.length === 0) {
      throw new AppException('No failed steps to retry', HttpStatus.CONFLICT, {
        code: ERROR_CODES.EXECUTION_NOT_RETRYABLE,
      });
    }

    for (const step of failedSteps) {
      await this.resolveAgentPin(step.agentCode, step.agentVersion);
      this.resetStepForRetry(step);
      await this.executionStepsRepository.save(step);
    }

    execution.status = ExecutionStatus.PENDING;
    execution.completedAt = null;
    execution.errorJson = null;
    execution.startedAt = execution.startedAt ?? new Date();
    await this.executionsRepository.save(execution);

    await this.enqueueRun(execution.id);

    await this.auditLogService.record({
      domain: AuditDomain.EXECUTION,
      action: AuditAction.EXECUTION_RETRIED,
      resourceType: 'execution',
      resourceId: execution.id,
      resourceCode: execution.workflowCode ?? null,
      actorUserId: actorId ?? null,
      metadata: { workflowId: execution.workflowId, workflowVersion: execution.workflowVersion },
    });

    return this.toExecutionDto(execution);
  }

  private async start(
    workflowId: string,
    version: number | null,
    input: Record<string, unknown>,
    startedBy: string,
  ): Promise<ExecutionResponseDto> {
    this.assertInputSize(input);

    const workflow = await this.workflowsRepository.findById(workflowId);
    if (!workflow || workflow.status !== WorkflowStatus.PUBLISHED) {
      throw new AppException('Workflow not found or not published', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const targetVersion = version ?? workflow.currentVersion;
    if (targetVersion == null) {
      throw new AppException('Workflow has no published version', HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ERROR_CODES.EXECUTION_NOT_STARTABLE,
      });
    }

    const workflowVersion = await this.workflowVersionsRepository.findByWorkflowAndVersion(
      workflow.id,
      targetVersion,
    );
    if (!workflowVersion || workflowVersion.status !== WorkflowVersionStatus.PUBLISHED) {
      throw new AppException('Published workflow version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        details: { version: targetVersion },
      });
    }

    const validation = await this.definitionValidator.validate(workflowVersion.definitionJson, {
      checkAgents: true,
    });
    if (!validation.valid || !validation.definition) {
      throw new AppException(
        'Workflow definition is not executable',
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          code: ERROR_CODES.EXECUTION_INVALID_DEFINITION,
          details: { errors: validation.errors },
        },
      );
    }

    const definition = this.definitionValidator.cloneDefinition(validation.definition);
    assertRequiredInputs(definition, input);
    const agentPins = await this.buildAgentPins(definition);
    const snapshot: DefinitionSnapshot = { definition, agentPins };

    const context: Record<string, unknown> = {
      ...definition.variables,
      ...input,
      input,
    };

    const hasNoNodes = definition.nodes.length === 0;

    const execution = await this.executionsRepository.createAndSave({
      workflowId: workflow.id,
      workflowCode: workflow.code,
      workflowVersion: targetVersion,
      status: hasNoNodes ? ExecutionStatus.COMPLETED : ExecutionStatus.PENDING,
      inputJson: input,
      contextJson: context,
      definitionSnapshot: snapshot,
      errorJson: null,
      startedBy,
      startedAt: new Date(),
      completedAt: hasNoNodes ? new Date() : null,
    });

    if (!hasNoNodes) {
      for (const pin of agentPins) {
        const node = definition.nodes.find((n) => n.id === pin.nodeId)!;
        const maxRetries =
          typeof node.maxRetries === 'number' && node.maxRetries >= 0
            ? node.maxRetries
            : await this.resolveDefaultMaxRetries(pin.agentCode, pin.agentVersion);

        await this.executionStepsRepository.createAndSave({
          executionId: execution.id,
          nodeId: pin.nodeId,
          agentCode: pin.agentCode,
          agentVersion: pin.agentVersion,
          status: ExecutionStepStatus.PENDING,
          attempt: 0,
          maxRetries,
          inputJson: null,
          outputJson: null,
          errorJson: null,
          startedAt: null,
          completedAt: null,
        });
      }

      await this.enqueueRun(execution.id);
    }

    await this.auditLogService.record({
      domain: AuditDomain.EXECUTION,
      action: AuditAction.EXECUTION_STARTED,
      resourceType: 'execution',
      resourceId: execution.id,
      resourceCode: workflow.code,
      actorUserId: startedBy,
      metadata: { workflowId: workflow.id, workflowVersion: targetVersion },
    });

    return this.toExecutionDto(execution);
  }

  private async buildAgentPins(definition: WorkflowDefinition): Promise<AgentPin[]> {
    const pins: AgentPin[] = [];
    for (const node of definition.nodes) {
      const pin = await this.resolveAgentPin(node.agentCode, node.agentVersion ?? null);
      pins.push({
        nodeId: node.id,
        agentCode: pin.agentCode,
        agentVersion: pin.agentVersion,
      });
    }
    return pins;
  }

  private async resolveAgentPin(
    agentCode: string,
    agentVersion: number | null,
  ): Promise<{ agentCode: string; agentVersion: number }> {
    const agent = await this.agentsService.assertAssignableByCode(agentCode);
    const versionNumber = agentVersion ?? agent.currentVersion;
    if (versionNumber == null) {
      throw new AppException(
        'Agent has no published version to pin',
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          code: ERROR_CODES.EXECUTION_AGENT_UNAVAILABLE,
          details: { agentCode },
        },
      );
    }

    const versionEntity = await this.agentVersionsRepository.findByAgentAndVersion(
      agent.id,
      versionNumber,
    );
    if (!versionEntity || versionEntity.status !== AgentVersionStatus.PUBLISHED) {
      throw new AppException('Agent version is not published', HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ERROR_CODES.EXECUTION_AGENT_UNAVAILABLE,
        details: { agentCode, agentVersion: versionNumber },
      });
    }

    return { agentCode: agent.code, agentVersion: versionNumber };
  }

  private resetStepForRetry(step: ExecutionStepEntity): void {
    step.status = ExecutionStepStatus.PENDING;
    step.errorJson = null;
    step.outputJson = null;
    step.inputJson = null;
    step.startedAt = null;
    step.completedAt = null;
    // Reset attempt so manual retry gets a fresh auto-retry budget.
    step.attempt = 0;
  }

  private async resolveDefaultMaxRetries(agentCode: string, agentVersion: number): Promise<number> {
    const agent = await this.agentsRepository.findByCode(agentCode);
    if (!agent || agent.status !== AgentStatus.PUBLISHED) {
      return 0;
    }
    const version = await this.agentVersionsRepository.findByAgentAndVersion(
      agent.id,
      agentVersion,
    );
    return version?.maxRetries ?? 0;
  }

  private async enqueueRun(executionId: string): Promise<void> {
    try {
      await this.executionQueue.add(
        EXECUTION_JOB_RUN,
        { executionId },
        {
          jobId: `execution-${executionId}-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to enqueue execution ${executionId}`, error);
      throw new AppException('Failed to enqueue execution', HttpStatus.INTERNAL_SERVER_ERROR, {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }
  }

  private assertInputSize(input: Record<string, unknown>): void {
    const size = jsonPayloadByteSize(input);
    if (size > MAX_EXECUTION_INPUT_BYTES) {
      throw new AppException('input exceeds maximum size of 256KB', HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_ERROR,
        details: { field: 'input', size },
      });
    }
  }

  private async requireExecution(id: string): Promise<ExecutionEntity> {
    const execution = await this.executionsRepository.findById(id);
    if (!execution) {
      throw new AppException('Execution not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.EXECUTION_NOT_FOUND,
      });
    }
    return execution;
  }

  private toExecutionDto(entity: ExecutionEntity): ExecutionResponseDto {
    return plainToInstance(
      ExecutionResponseDto,
      {
        id: entity.id,
        workflowId: entity.workflowId,
        workflowCode: entity.workflowCode,
        workflowVersion: entity.workflowVersion,
        status: entity.status,
        input: entity.inputJson,
        context: entity.contextJson,
        error: entity.errorJson,
        startedBy: entity.startedBy,
        startedAt: entity.startedAt,
        completedAt: entity.completedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toStepDto(entity: ExecutionStepEntity): ExecutionStepResponseDto {
    return plainToInstance(
      ExecutionStepResponseDto,
      {
        id: entity.id,
        executionId: entity.executionId,
        nodeId: entity.nodeId,
        agentCode: entity.agentCode,
        agentVersion: entity.agentVersion,
        status: entity.status,
        attempt: entity.attempt,
        maxRetries: entity.maxRetries,
        input: entity.inputJson,
        output: entity.outputJson,
        error: entity.errorJson,
        startedAt: entity.startedAt,
        completedAt: entity.completedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
