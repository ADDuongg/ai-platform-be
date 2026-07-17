import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { WorkflowEntity } from '../entities/workflow.entity';
import { WorkflowStatus } from '../enums';

export interface ListWorkflowsFilter {
  status?: WorkflowStatus;
  category?: string;
  /** When false, only published workflows are returned */
  includeDrafts: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class WorkflowsRepository extends BaseRepository<WorkflowEntity> {
  constructor(
    @InjectRepository(WorkflowEntity)
    repository: Repository<WorkflowEntity>,
  ) {
    super(repository);
  }

  async findByCode(code: string, manager?: EntityManager): Promise<WorkflowEntity | null> {
    // Soft-deleted (archived) rows are excluded so codes can be reused after archive.
    return this.getRepo(manager).findOne({
      where: { code },
    });
  }

  async findManyFiltered(filter: ListWorkflowsFilter): Promise<[WorkflowEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('workflow')
      .orderBy('workflow.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (!filter.includeDrafts) {
      qb.andWhere('workflow.status = :published', { published: WorkflowStatus.PUBLISHED });
    } else if (filter.status) {
      qb.andWhere('workflow.status = :status', { status: filter.status });
    }

    if (filter.category) {
      qb.andWhere('workflow.category = :category', { category: filter.category });
    }

    return qb.getManyAndCount();
  }
}
