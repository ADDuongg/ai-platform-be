import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { ExecutionStepEntity } from '../entities/execution-step.entity';
import { ExecutionStepStatus } from '../enums';

@Injectable()
export class ExecutionStepsRepository extends BaseRepository<ExecutionStepEntity> {
  constructor(
    @InjectRepository(ExecutionStepEntity)
    repository: Repository<ExecutionStepEntity>,
  ) {
    super(repository);
  }

  async findByExecutionId(
    executionId: string,
    manager?: EntityManager,
  ): Promise<ExecutionStepEntity[]> {
    return this.getRepo(manager).find({
      where: { executionId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByExecutionAndNode(
    executionId: string,
    nodeId: string,
    manager?: EntityManager,
  ): Promise<ExecutionStepEntity | null> {
    return this.getRepo(manager).findOne({ where: { executionId, nodeId } });
  }

  async findByExecutionAndId(
    executionId: string,
    stepId: string,
    manager?: EntityManager,
  ): Promise<ExecutionStepEntity | null> {
    return this.getRepo(manager).findOne({ where: { id: stepId, executionId } });
  }

  async cancelPendingSteps(executionId: string, manager?: EntityManager): Promise<void> {
    await this.getRepo(manager).update(
      {
        executionId,
        status: In([
          ExecutionStepStatus.PENDING,
          ExecutionStepStatus.RUNNING,
          ExecutionStepStatus.RETRYING,
        ]),
      },
      {
        status: ExecutionStepStatus.CANCELLED,
        completedAt: new Date(),
      },
    );
  }
}
