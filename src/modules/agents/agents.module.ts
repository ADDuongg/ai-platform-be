import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '@modules/audit/audit.module';
import { LlmModule } from '@modules/llm/llm.module';
import { PromptsModule } from '@modules/prompts/prompts.module';
import { ToolsModule } from '@modules/tools/tools.module';

import { AgentsController } from './controllers/agents.controller';
import { AgentEntity } from './entities/agent.entity';
import { AgentVersionEntity } from './entities/agent-version.entity';
import { AgentVersionsRepository } from './repositories/agent-versions.repository';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentsService } from './services/agents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentEntity, AgentVersionEntity]),
    PromptsModule,
    ToolsModule,
    LlmModule,
    AuditModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentsRepository, AgentVersionsRepository],
  exports: [AgentsService, AgentsRepository, AgentVersionsRepository],
})
export class AgentsModule {}
