import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ToolsController } from './controllers/tools.controller';
import { ToolEntity } from './entities/tool.entity';
import { ToolVersionEntity } from './entities/tool-version.entity';
import { ToolVersionsRepository } from './repositories/tool-versions.repository';
import { ToolsRepository } from './repositories/tools.repository';
import { ToolsService } from './services/tools.service';

@Module({
  imports: [TypeOrmModule.forFeature([ToolEntity, ToolVersionEntity])],
  controllers: [ToolsController],
  providers: [ToolsService, ToolsRepository, ToolVersionsRepository],
  exports: [ToolsService],
})
export class ToolsModule {}
