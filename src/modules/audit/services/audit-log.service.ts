import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';

import { RecordAuditParams } from '../constants/audit.constants';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import { DomainAuditLogsRepository } from '../repositories/domain-audit-logs.repository';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly domainAuditLogsRepository: DomainAuditLogsRepository) {}

  /**
   * Best-effort append-only write. Never throws to the caller.
   */
  async record(params: RecordAuditParams): Promise<void> {
    try {
      await this.domainAuditLogsRepository.insert(params);
    } catch (error) {
      this.logger.error(
        `Failed to persist domain audit event domain=${params.domain} action=${params.action} resourceId=${params.resourceId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(
    query: ListAuditLogsQueryDto,
  ): Promise<{ data: AuditLogResponseDto[]; meta: Record<string, number> }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const [rows, total] = await this.domainAuditLogsRepository.findManyFiltered({
      domain: query.domain,
      action: query.action,
      resourceId: query.resourceId,
      resourceCode: query.resourceCode,
      actorUserId: query.actorUserId,
      createdFrom: query.createdFrom ? new Date(query.createdFrom) : undefined,
      createdTo: query.createdTo ? new Date(query.createdTo) : undefined,
      page,
      limit,
    });

    return {
      data: rows.map((row) => this.toDto(row)),
      meta: { page, limit, total },
    };
  }

  async findById(id: string): Promise<AuditLogResponseDto> {
    const row = await this.domainAuditLogsRepository.findById(id);
    if (!row) {
      throw new AppException('Audit log not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.AUDIT_LOG_NOT_FOUND,
      });
    }
    return this.toDto(row);
  }

  private toDto(row: {
    id: string;
    domain: string;
    action: string;
    resourceType: string;
    resourceId: string;
    resourceCode: string | null;
    actorUserId: string | null;
    ip: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  }): AuditLogResponseDto {
    return plainToInstance(
      AuditLogResponseDto,
      {
        id: row.id,
        domain: row.domain,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        resourceCode: row.resourceCode,
        actorUserId: row.actorUserId,
        ip: row.ip,
        userAgent: row.userAgent,
        metadata: row.metadata,
        createdAt: row.createdAt,
      },
      { excludeExtraneousValues: true },
    );
  }
}
