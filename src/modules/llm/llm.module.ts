import { Module } from '@nestjs/common';

import { LlmCatalogController } from './controllers/llm-catalog.controller';
import { LlmCatalogService } from './services/llm-catalog.service';

@Module({
  controllers: [LlmCatalogController],
  providers: [LlmCatalogService],
  exports: [LlmCatalogService],
})
export class LlmModule {}
