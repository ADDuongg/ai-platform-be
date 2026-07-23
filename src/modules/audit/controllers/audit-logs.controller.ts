import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs-query.dto';
import { AuditLogService } from '../services/audit-log.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions(PERMISSIONS.AUDIT.READ)
  @ApiOperation({ summary: 'List domain audit events' })
  async list(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<{ data: AuditLogResponseDto[]; meta: Record<string, number> }> {
    return this.auditLogService.list(query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.AUDIT.READ)
  @ApiOperation({ summary: 'Get domain audit event by id' })
  @ApiOkResponse({ type: AuditLogResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogResponseDto> {
    return this.auditLogService.findById(id);
  }
}
