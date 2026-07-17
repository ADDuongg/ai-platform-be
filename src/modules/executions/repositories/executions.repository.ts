import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { ExecutionEntity } from '../entities/execution.entity';
import { ExecutionStatus } from '../enums';

export interface ListExecutionsFilter {
  workflowId?: string;
  status?: ExecutionStatus;
  startedBy?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ExecutionsRepository extends BaseRepository<ExecutionEntity> {
  constructor(
    @InjectRepository(ExecutionEntity)
    repository: Repository<ExecutionEntity>,
  ) {
    super(repository);
  }

  async findManyFiltered(filter: ListExecutionsFilter): Promise<[ExecutionEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('execution')
      .orderBy('execution.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (filter.workflowId) {
      qb.andWhere('execution.workflowId = :workflowId', { workflowId: filter.workflowId });
    }
    if (filter.status) {
      qb.andWhere('execution.status = :status', { status: filter.status });
    }
    if (filter.startedBy) {
      qb.andWhere('execution.startedBy = :startedBy', { startedBy: filter.startedBy });
    }

    return qb.getManyAndCount();
  }
}
