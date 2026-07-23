import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '@modules/audit/audit.module';

import { PromptsController } from './controllers/prompts.controller';
import { PromptEntity } from './entities/prompt.entity';
import { PromptVersionEntity } from './entities/prompt-version.entity';
import { PromptVersionsRepository } from './repositories/prompt-versions.repository';
import { PromptsRepository } from './repositories/prompts.repository';
import { PromptsService } from './services/prompts.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromptEntity, PromptVersionEntity]), AuditModule],
  controllers: [PromptsController],
  providers: [PromptsService, PromptsRepository, PromptVersionsRepository],
  exports: [PromptsService],
})
export class PromptsModule {}
