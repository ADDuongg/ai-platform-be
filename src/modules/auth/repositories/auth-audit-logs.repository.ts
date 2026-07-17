import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthAction, AuthAuditLogEntity } from '../entities/auth-audit-log.entity';

@Injectable()
export class AuthAuditLogsRepository {
  constructor(
    @InjectRepository(AuthAuditLogEntity)
    private readonly repository: Repository<AuthAuditLogEntity>,
  ) {}

  async log(params: {
    userId?: string | null;
    action: AuthAction;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const entity = this.repository.create({
      userId: params.userId ?? null,
      action: params.action,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    });
    await this.repository.save(entity);
  }
}
