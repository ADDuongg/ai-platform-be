import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import {
  ListLlmModelsQueryDto,
  LlmModelDto,
  LlmProviderDto,
} from '../dto/llm-catalog-response.dto';
import { LlmCatalogService } from '../services/llm-catalog.service';

@ApiTags('LLM Catalog')
@ApiBearerAuth('JWT')
@Controller({ path: 'llm', version: '1' })
export class LlmCatalogController {
  constructor(private readonly llmCatalogService: LlmCatalogService) {}

  @Get('providers')
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'List LLM providers and their models (static allowlist)' })
  @ApiOkResponse({ type: [LlmProviderDto] })
  listProviders(): LlmProviderDto[] {
    return this.llmCatalogService.listProviders();
  }

  @Get('models')
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'List LLM models, optionally filtered by provider' })
  @ApiOkResponse({ type: [LlmModelDto] })
  listModels(@Query() query: ListLlmModelsQueryDto): LlmModelDto[] {
    return this.llmCatalogService.listModels(query.provider);
  }
}
