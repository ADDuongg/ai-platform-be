import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { ToolVersionEntity } from '../entities/tool-version.entity';
import { ToolVersionStatus } from '../enums';

@Injectable()
export class ToolVersionsRepository extends BaseRepository<ToolVersionEntity> {
  constructor(
    @InjectRepository(ToolVersionEntity)
    repository: Repository<ToolVersionEntity>,
  ) {
    super(repository);
  }

  async findByToolAndVersion(
    toolId: string,
    version: number,
    manager?: EntityManager,
  ): Promise<ToolVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { toolId, version },
    });
  }

  async findDraftByToolId(
    toolId: string,
    manager?: EntityManager,
  ): Promise<ToolVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { toolId, status: ToolVersionStatus.DRAFT },
    });
  }

  async findAllByToolId(
    toolId: string,
    includeDrafts: boolean,
    manager?: EntityManager,
  ): Promise<ToolVersionEntity[]> {
    const qb = this.getRepo(manager)
      .createQueryBuilder('version')
      .where('version.toolId = :toolId', { toolId })
      .orderBy('version.version', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('version.status = :published', {
        published: ToolVersionStatus.PUBLISHED,
      });
    }

    return qb.getMany();
  }

  async getMaxVersion(toolId: string, manager?: EntityManager): Promise<number> {
    const raw = await this.getRepo(manager)
      .createQueryBuilder('version')
      .select('MAX(version.version)', 'max')
      .where('version.toolId = :toolId', { toolId })
      .getRawOne<{ max: string | null }>();

    return raw?.max ? Number(raw.max) : 0;
  }
}
