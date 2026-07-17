import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EXECUTION_JOB_RUN, EXECUTION_QUEUE } from '../constants/executions.constants';
import { ExecutionOrchestratorService } from '../services/execution-orchestrator.service';

type RunExecutionJob = {
  executionId: string;
};

@Processor(EXECUTION_QUEUE)
export class ExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(private readonly orchestrator: ExecutionOrchestratorService) {
    super();
  }

  async process(job: Job<RunExecutionJob>): Promise<void> {
    if (job.name !== EXECUTION_JOB_RUN) {
      this.logger.warn(`Ignoring unknown job name ${job.name}`);
      return;
    }
    const { executionId } = job.data;
    this.logger.log(`Processing execution ${executionId}`);
    await this.orchestrator.run(executionId);
  }
}
