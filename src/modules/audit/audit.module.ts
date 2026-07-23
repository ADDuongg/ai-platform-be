import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogsController } from './controllers/audit-logs.controller';
import { DomainAuditLogEntity } from './entities/domain-audit-log.entity';
import { DomainAuditLogsRepository } from './repositories/domain-audit-logs.repository';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([DomainAuditLogEntity])],
  controllers: [AuditLogsController],
  providers: [AuditLogService, DomainAuditLogsRepository],
  exports: [AuditLogService],
})
export class AuditModule {}
