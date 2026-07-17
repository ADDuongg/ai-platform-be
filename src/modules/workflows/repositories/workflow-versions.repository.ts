import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { WorkflowVersionEntity } from '../entities/workflow-version.entity';
import { WorkflowVersionStatus } from '../enums';

@Injectable()
export class WorkflowVersionsRepository extends BaseRepository<WorkflowVersionEntity> {
  constructor(
    @InjectRepository(WorkflowVersionEntity)
    repository: Repository<WorkflowVersionEntity>,
  ) {
    super(repository);
  }

  async findByWorkflowAndVersion(
    workflowId: string,
    version: number,
    manager?: EntityManager,
  ): Promise<WorkflowVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { workflowId, version },
    });
  }

  async findDraftByWorkflowId(
    workflowId: string,
    manager?: EntityManager,
  ): Promise<WorkflowVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { workflowId, status: WorkflowVersionStatus.DRAFT },
    });
  }

  async findAllByWorkflowId(
    workflowId: string,
    includeDrafts: boolean,
    manager?: EntityManager,
  ): Promise<WorkflowVersionEntity[]> {
    const qb = this.getRepo(manager)
      .createQueryBuilder('version')
      .where('version.workflowId = :workflowId', { workflowId })
      .orderBy('version.version', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('version.status = :published', {
        published: WorkflowVersionStatus.PUBLISHED,
      });
    }

    return qb.getMany();
  }

  async getMaxVersion(workflowId: string, manager?: EntityManager): Promise<number> {
    const raw = await this.getRepo(manager)
      .createQueryBuilder('version')
      .select('MAX(version.version)', 'max')
      .where('version.workflowId = :workflowId', { workflowId })
      .getRawOne<{ max: string | null }>();

    return raw?.max ? Number(raw.max) : 0;
  }
}
