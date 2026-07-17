import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { AgentVersionEntity } from '../entities/agent-version.entity';
import { AgentVersionStatus } from '../enums';

@Injectable()
export class AgentVersionsRepository extends BaseRepository<AgentVersionEntity> {
  constructor(
    @InjectRepository(AgentVersionEntity)
    repository: Repository<AgentVersionEntity>,
  ) {
    super(repository);
  }

  async findByAgentAndVersion(
    agentId: string,
    version: number,
    manager?: EntityManager,
  ): Promise<AgentVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { agentId, version },
    });
  }

  async findDraftByAgentId(
    agentId: string,
    manager?: EntityManager,
  ): Promise<AgentVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { agentId, status: AgentVersionStatus.DRAFT },
    });
  }

  async findPublishedByAgentId(
    agentId: string,
    manager?: EntityManager,
  ): Promise<AgentVersionEntity[]> {
    return this.getRepo(manager).find({
      where: { agentId, status: AgentVersionStatus.PUBLISHED },
      order: { version: 'DESC' },
    });
  }

  async findAllByAgentId(
    agentId: string,
    includeDrafts: boolean,
    manager?: EntityManager,
  ): Promise<AgentVersionEntity[]> {
    const qb = this.getRepo(manager)
      .createQueryBuilder('version')
      .where('version.agentId = :agentId', { agentId })
      .orderBy('version.version', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('version.status = :published', {
        published: AgentVersionStatus.PUBLISHED,
      });
    }

    return qb.getMany();
  }

  async getMaxVersion(agentId: string, manager?: EntityManager): Promise<number> {
    const raw = await this.getRepo(manager)
      .createQueryBuilder('version')
      .select('MAX(version.version)', 'max')
      .where('version.agentId = :agentId', { agentId })
      .getRawOne<{ max: string | null }>();

    return raw?.max ? Number(raw.max) : 0;
  }
}
