import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../agents/agents.module';
import { WorkflowBuilderController } from './controllers/workflow-builder.controller';
import { WorkflowsController } from './controllers/workflows.controller';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowVersionEntity } from './entities/workflow-version.entity';
import { WorkflowVersionsRepository } from './repositories/workflow-versions.repository';
import { WorkflowsRepository } from './repositories/workflows.repository';
import { WorkflowBuilderService } from './services/workflow-builder.service';
import { WorkflowDefinitionValidator } from './services/workflow-definition.validator';
import { WorkflowsService } from './services/workflows.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity, WorkflowVersionEntity]), AgentsModule],
  controllers: [WorkflowsController, WorkflowBuilderController],
  providers: [
    WorkflowsService,
    WorkflowBuilderService,
    WorkflowDefinitionValidator,
    WorkflowsRepository,
    WorkflowVersionsRepository,
  ],
  exports: [
    WorkflowsService,
    WorkflowBuilderService,
    WorkflowDefinitionValidator,
    WorkflowsRepository,
    WorkflowVersionsRepository,
  ],
})
export class WorkflowsModule {}
