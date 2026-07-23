import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { RecordAuditParams } from '../constants/audit.constants';
import { DomainAuditLogEntity } from '../entities/domain-audit-log.entity';

@Injectable()
export class DomainAuditLogsRepository {
  constructor(
    @InjectRepository(DomainAuditLogEntity)
    private readonly repository: Repository<DomainAuditLogEntity>,
  ) {}

  async insert(params: RecordAuditParams): Promise<DomainAuditLogEntity> {
    const entity = this.repository.create({
      domain: params.domain,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceCode: params.resourceCode ?? null,
      actorUserId: params.actorUserId ?? null,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<DomainAuditLogEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findManyFiltered(params: {
    domain?: string;
    action?: string;
    resourceId?: string;
    resourceCode?: string;
    actorUserId?: string;
    createdFrom?: Date;
    createdTo?: Date;
    page: number;
    limit: number;
  }): Promise<[DomainAuditLogEntity[], number]> {
    const where: FindOptionsWhere<DomainAuditLogEntity> = {};

    if (params.domain) {
      where.domain = params.domain as DomainAuditLogEntity['domain'];
    }
    if (params.action) {
      where.action = params.action as DomainAuditLogEntity['action'];
    }
    if (params.resourceId) {
      where.resourceId = params.resourceId;
    }
    if (params.resourceCode) {
      where.resourceCode = params.resourceCode;
    }
    if (params.actorUserId) {
      where.actorUserId = params.actorUserId;
    }
    if (params.createdFrom && params.createdTo) {
      where.createdAt = Between(params.createdFrom, params.createdTo);
    } else if (params.createdFrom) {
      where.createdAt = MoreThanOrEqual(params.createdFrom);
    } else if (params.createdTo) {
      where.createdAt = LessThanOrEqual(params.createdTo);
    }

    return this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    });
  }
}
