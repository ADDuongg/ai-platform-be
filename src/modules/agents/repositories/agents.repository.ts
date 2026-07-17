import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { AgentEntity } from '../entities/agent.entity';
import { AgentStatus, CapabilityType } from '../enums';

export interface ListAgentsFilter {
  status?: AgentStatus;
  capabilityType?: CapabilityType;
  enabled?: boolean;
  /** When false, only published agents are returned */
  includeDrafts: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class AgentsRepository extends BaseRepository<AgentEntity> {
  constructor(
    @InjectRepository(AgentEntity)
    repository: Repository<AgentEntity>,
  ) {
    super(repository);
  }

  async findByCode(code: string, manager?: EntityManager): Promise<AgentEntity | null> {
    return this.getRepo(manager).findOne({
      where: { code },
      withDeleted: true,
    });
  }

  async findByIdIncludingDeleted(id: string): Promise<AgentEntity | null> {
    return this.repository.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  async findManyFiltered(filter: ListAgentsFilter): Promise<[AgentEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('agent')
      .orderBy('agent.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (!filter.includeDrafts) {
      qb.andWhere('agent.status = :published', { published: AgentStatus.PUBLISHED });
    } else if (filter.status) {
      qb.andWhere('agent.status = :status', { status: filter.status });
    }

    if (filter.capabilityType) {
      qb.andWhere('agent.capabilityType = :capabilityType', {
        capabilityType: filter.capabilityType,
      });
    }

    if (filter.enabled !== undefined) {
      qb.andWhere('agent.enabled = :enabled', { enabled: filter.enabled });
    }

    return qb.getManyAndCount();
  }
}
