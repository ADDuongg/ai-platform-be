import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { ToolEntity } from '../entities/tool.entity';
import { ToolStatus, ToolType } from '../enums';

export interface ListToolsFilter {
  status?: ToolStatus;
  toolType?: ToolType;
  enabled?: boolean;
  includeDrafts: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class ToolsRepository extends BaseRepository<ToolEntity> {
  constructor(
    @InjectRepository(ToolEntity)
    repository: Repository<ToolEntity>,
  ) {
    super(repository);
  }

  async findByCode(code: string, manager?: EntityManager): Promise<ToolEntity | null> {
    return this.getRepo(manager).findOne({
      where: { code },
    });
  }

  async findManyFiltered(filter: ListToolsFilter): Promise<[ToolEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('tool')
      .orderBy('tool.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (!filter.includeDrafts) {
      qb.andWhere('tool.status = :published', { published: ToolStatus.PUBLISHED });
    } else if (filter.status) {
      qb.andWhere('tool.status = :status', { status: filter.status });
    }

    if (filter.toolType) {
      qb.andWhere('tool.toolType = :toolType', { toolType: filter.toolType });
    }

    if (filter.enabled !== undefined) {
      qb.andWhere('tool.enabled = :enabled', { enabled: filter.enabled });
    }

    return qb.getManyAndCount();
  }
}
