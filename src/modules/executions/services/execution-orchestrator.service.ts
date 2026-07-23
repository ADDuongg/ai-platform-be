import { Inject, Injectable, Logger } from '@nestjs/common';

import { AgentsRepository } from '@modules/agents/repositories/agents.repository';
import { AgentVersionsRepository } from '@modules/agents/repositories/agent-versions.repository';
import { AgentStatus, AgentVersionStatus } from '@modules/agents/enums';
import type { WorkflowNode } from '@modules/workflows/types';

import { AGENT_RUNNER } from '../constants/executions.constants';
import { ExecutionStepEntity } from '../entities/execution-step.entity';
import { ExecutionEntity } from '../entities/execution.entity';
import { ExecutionStatus, ExecutionStepStatus } from '../enums';
import { ExecutionStepsRepository } from '../repositories/execution-steps.repository';
import { ExecutionsRepository } from '../repositories/executions.repository';
import type { AgentRunner } from './agent-runner.types';
import { ArtifactMaterializerService } from './artifact-materializer.service';
import { applyInputMapping, applyOutputMapping } from './context-mapper';
import { WorkflowEngineService } from './workflow-engine.service';

type StepRunOutcome = 'completed' | 'failed_terminal' | 'cancelled';

@Injectable()
export class ExecutionOrchestratorService {
  private readonly logger = new Logger(ExecutionOrchestratorService.name);

  constructor(
    private readonly executionsRepository: ExecutionsRepository,
    private readonly executionStepsRepository: ExecutionStepsRepository,
    private readonly workflowEngine: WorkflowEngineService,
    @Inject(AGENT_RUNNER) private readonly agentRunner: AgentRunner,
    private readonly agentsRepository: AgentsRepository,
    private readonly agentVersionsRepository: AgentVersionsRepository,
    private readonly artifactMaterializer: ArtifactMaterializerService,
  ) {}

  async run(executionId: string): Promise<void> {
    let execution = await this.executionsRepository.findById(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found; skipping job`);
      return;
    }

    if (
      execution.status === ExecutionStatus.CANCELLED ||
      execution.status === ExecutionStatus.COMPLETED ||
      execution.status === ExecutionStatus.FAILED
    ) {
      return;
    }

    if (execution.status === ExecutionStatus.PENDING) {
      execution.status = ExecutionStatus.RUNNING;
      execution.startedAt = execution.startedAt ?? new Date();
      await this.executionsRepository.save(execution);
    }

    const definition = execution.definitionSnapshot.definition;

    if (definition.nodes.length === 0) {
      await this.markExecutionTerminal(execution, ExecutionStatus.COMPLETED);
      return;
    }

    while (true) {
      execution = await this.reloadExecution(executionId);
      if (!execution) {
        this.logger.warn(`Execution ${executionId} disappeared during run; stopping`);
        return;
      }
      if (this.isExecutionCancelled(execution)) {
        await this.cancelPendingSteps(executionId);
        return;
      }

      let steps = await this.executionStepsRepository.findByExecutionId(executionId);
      const stepStates = steps.map((step) => ({
        nodeId: step.nodeId,
        status: step.status,
      }));

      if (this.workflowEngine.allCompleted(stepStates)) {
        await this.markExecutionTerminal(execution, ExecutionStatus.COMPLETED);
        return;
      }

      if (this.workflowEngine.hasFailed(stepStates)) {
        const failedStep = steps.find((step) => step.status === ExecutionStepStatus.FAILED);
        await this.markExecutionTerminal(
          execution,
          ExecutionStatus.FAILED,
          failedStep?.errorJson ?? { message: 'Step failed' },
        );
        return;
      }

      const readyIds = this.workflowEngine.resolveReadyNodeIds(definition, stepStates);
      if (readyIds.length === 0) {
        // Deadlock / waiting — should not happen if graph is valid; treat as failed
        await this.markExecutionTerminal(execution, ExecutionStatus.FAILED, {
          message: 'No ready steps while execution incomplete',
        });
        return;
      }

      for (const nodeId of readyIds) {
        execution = await this.reloadExecution(executionId);
        if (!execution) {
          this.logger.warn(`Execution ${executionId} disappeared during run; stopping`);
          return;
        }
        if (this.isExecutionCancelled(execution)) {
          await this.cancelPendingSteps(executionId);
          return;
        }

        const step = steps.find((candidate) => candidate.nodeId === nodeId);
        const node = this.workflowEngine.findNode(definition, nodeId);
        if (!step || !node) {
          continue;
        }

        const stepRunOutcome = await this.runStep(execution, step, node);
        if (stepRunOutcome === 'cancelled') {
          return;
        }
        if (stepRunOutcome === 'failed_terminal') {
          execution = await this.reloadExecution(executionId);
          if (!execution) {
            return;
          }
          await this.markExecutionTerminal(
            execution,
            ExecutionStatus.FAILED,
            step.errorJson ?? { message: 'Step failed' },
          );
          return;
        }

        steps = await this.executionStepsRepository.findByExecutionId(executionId);
      }
    }
  }

  private async runStep(
    execution: ExecutionEntity,
    step: ExecutionStepEntity,
    node: WorkflowNode,
  ): Promise<StepRunOutcome> {
    const maxRetries = step.maxRetries;

    while (true) {
      const currentExecution = await this.executionsRepository.findById(execution.id);
      if (!currentExecution || currentExecution.status === ExecutionStatus.CANCELLED) {
        step.status = ExecutionStepStatus.CANCELLED;
        step.completedAt = new Date();
        await this.executionStepsRepository.save(step);
        await this.executionStepsRepository.cancelPendingSteps(execution.id);
        return 'cancelled';
      }

      step.attempt += 1;
      step.status = ExecutionStepStatus.RUNNING;
      step.startedAt = new Date();
      step.completedAt = null;
      step.errorJson = null;

      const context = { ...currentExecution.contextJson };
      const mappedInput = applyInputMapping(context, node.inputMapping);
      step.inputJson = mappedInput;
      await this.executionStepsRepository.save(step);

      try {
        // Re-check agent eligibility on each attempt (retry policy)
        await this.assertAgentAvailable(step.agentCode, step.agentVersion);

        const output = await this.agentRunner.invoke({
          agentCode: step.agentCode,
          agentVersion: step.agentVersion,
          nodeId: step.nodeId,
          input: mappedInput,
          config: node.config,
          attempt: step.attempt,
        });

        step.outputJson = output;
        step.status = ExecutionStepStatus.COMPLETED;
        step.completedAt = new Date();
        await this.executionStepsRepository.save(step);

        currentExecution.contextJson = applyOutputMapping(context, output, node.outputMapping);
        await this.executionsRepository.save(currentExecution);
        return 'completed';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent invocation failed';
        step.errorJson = { message };
        const retriesUsed = Math.max(0, step.attempt - 1);
        if (retriesUsed < maxRetries) {
          step.status = ExecutionStepStatus.RETRYING;
          await this.executionStepsRepository.save(step);
          continue;
        }
        step.status = ExecutionStepStatus.FAILED;
        step.completedAt = new Date();
        await this.executionStepsRepository.save(step);
        return 'failed_terminal';
      }
    }
  }

  private async assertAgentAvailable(code: string, version: number): Promise<void> {
    const agent = await this.agentsRepository.findByCode(code.trim().toLowerCase());
    const agentAvailable =
      agent && agent.deletedAt == null && agent.status === AgentStatus.PUBLISHED && agent.enabled;
    if (!agentAvailable) {
      throw new Error(`Agent ${code} is not available (published+enabled required)`);
    }

    const agentVersion = await this.agentVersionsRepository.findByAgentAndVersion(
      agent.id,
      version,
    );
    if (!agentVersion || agentVersion.status !== AgentVersionStatus.PUBLISHED) {
      throw new Error(`Agent ${code} version ${version} is not published`);
    }
  }

  private async reloadExecution(id: string): Promise<ExecutionEntity | null> {
    return this.executionsRepository.findById(id);
  }

  private isExecutionCancelled(execution: ExecutionEntity): boolean {
    return execution.status === ExecutionStatus.CANCELLED;
  }

  private async cancelPendingSteps(executionId: string): Promise<void> {
    await this.executionStepsRepository.cancelPendingSteps(executionId);
  }

  private async markExecutionTerminal(
    execution: ExecutionEntity,
    status: ExecutionStatus.COMPLETED | ExecutionStatus.FAILED,
    errorJson: Record<string, unknown> | null = null,
  ): Promise<void> {
    execution.status = status;
    execution.completedAt = new Date();
    execution.errorJson = errorJson;
    await this.executionsRepository.save(execution);

    if (status === ExecutionStatus.COMPLETED) {
      // Best-effort: materializer catches internally and must never flip COMPLETED → FAILED.
      try {
        await this.artifactMaterializer.materializeForCompletedExecution(execution);
      } catch (error) {
        this.logger.error(
          `Unexpected artifact materializer throw for execution ${execution.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
