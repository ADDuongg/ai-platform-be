import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { ExecutionArtifactEntity } from '../entities/execution-artifact.entity';

@Injectable()
export class ExecutionArtifactsRepository extends BaseRepository<ExecutionArtifactEntity> {
  constructor(
    @InjectRepository(ExecutionArtifactEntity)
    repository: Repository<ExecutionArtifactEntity>,
  ) {
    super(repository);
  }

  async countByExecutionId(executionId: string): Promise<number> {
    return this.repository.count({ where: { executionId } });
  }

  async findAllByExecutionId(executionId: string): Promise<ExecutionArtifactEntity[]> {
    return this.repository.find({
      where: { executionId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByExecutionAndId(
    executionId: string,
    artifactId: string,
  ): Promise<ExecutionArtifactEntity | null> {
    return this.repository.findOne({ where: { id: artifactId, executionId } });
  }
}
