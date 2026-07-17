import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { PromptEntity } from '../entities/prompt.entity';
import { PromptStatus } from '../enums';

export interface ListPromptsFilter {
  status?: PromptStatus;
  category?: string;
  tag?: string;
  enabled?: boolean;
  includeDrafts: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class PromptsRepository extends BaseRepository<PromptEntity> {
  constructor(
    @InjectRepository(PromptEntity)
    repository: Repository<PromptEntity>,
  ) {
    super(repository);
  }

  async findByCode(code: string, manager?: EntityManager): Promise<PromptEntity | null> {
    return this.getRepo(manager).findOne({
      where: { code },
    });
  }

  async findManyFiltered(filter: ListPromptsFilter): Promise<[PromptEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('prompt')
      .orderBy('prompt.createdAt', 'DESC')
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    if (!filter.includeDrafts) {
      qb.andWhere('prompt.status = :published', { published: PromptStatus.PUBLISHED });
    } else if (filter.status) {
      qb.andWhere('prompt.status = :status', { status: filter.status });
    }

    if (filter.category) {
      qb.andWhere('prompt.category = :category', { category: filter.category });
    }

    if (filter.tag) {
      qb.andWhere('prompt.tags @> :tag', { tag: JSON.stringify([filter.tag]) });
    }

    if (filter.enabled !== undefined) {
      qb.andWhere('prompt.enabled = :enabled', { enabled: filter.enabled });
    }

    return qb.getManyAndCount();
  }
}
