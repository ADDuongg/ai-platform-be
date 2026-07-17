import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { BaseRepository } from '@common/repositories';

import { PromptVersionEntity } from '../entities/prompt-version.entity';
import { PromptVersionStatus } from '../enums';

@Injectable()
export class PromptVersionsRepository extends BaseRepository<PromptVersionEntity> {
  constructor(
    @InjectRepository(PromptVersionEntity)
    repository: Repository<PromptVersionEntity>,
  ) {
    super(repository);
  }

  async findByPromptAndVersion(
    promptId: string,
    version: number,
    manager?: EntityManager,
  ): Promise<PromptVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { promptId, version },
    });
  }

  async findDraftByPromptId(
    promptId: string,
    manager?: EntityManager,
  ): Promise<PromptVersionEntity | null> {
    return this.getRepo(manager).findOne({
      where: { promptId, status: PromptVersionStatus.DRAFT },
    });
  }

  async findAllByPromptId(
    promptId: string,
    includeDrafts: boolean,
    manager?: EntityManager,
  ): Promise<PromptVersionEntity[]> {
    const qb = this.getRepo(manager)
      .createQueryBuilder('version')
      .where('version.promptId = :promptId', { promptId })
      .orderBy('version.version', 'DESC');

    if (!includeDrafts) {
      qb.andWhere('version.status = :published', {
        published: PromptVersionStatus.PUBLISHED,
      });
    }

    return qb.getMany();
  }

  async getMaxVersion(promptId: string, manager?: EntityManager): Promise<number> {
    const raw = await this.getRepo(manager)
      .createQueryBuilder('version')
      .select('MAX(version.version)', 'max')
      .where('version.promptId = :promptId', { promptId })
      .getRawOne<{ max: string | null }>();

    return raw?.max ? Number(raw.max) : 0;
  }
}
