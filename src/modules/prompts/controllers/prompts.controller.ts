import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, JwtPayload, Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { CreatePromptDto } from '../dto/create-prompt.dto';
import { CreatePromptVersionDto } from '../dto/create-prompt-version.dto';
import { ListPromptsQueryDto } from '../dto/list-prompts-query.dto';
import { PromptResponseDto } from '../dto/prompt-response.dto';
import { PromptVersionResponseDto } from '../dto/prompt-version-response.dto';
import { UpdatePromptDto } from '../dto/update-prompt.dto';
import { PromptsService } from '../services/prompts.service';

@ApiTags('Prompts')
@ApiBearerAuth('JWT')
@Controller({ path: 'prompts', version: '1' })
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @Permissions(PERMISSIONS.PROMPTS.READ)
  @ApiOperation({ summary: 'List Prompts' })
  async list(
    @Query() query: ListPromptsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: PromptResponseDto[]; meta: Record<string, number> }> {
    return this.promptsService.list(query, user.permissions);
  }

  @Post()
  @Permissions(PERMISSIONS.PROMPTS.CREATE)
  @ApiOperation({ summary: 'Register draft Prompt' })
  @ApiCreatedResponse({ type: PromptResponseDto })
  async create(
    @Body() dto: CreatePromptDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PromptResponseDto> {
    return this.promptsService.create(dto, user.sub);
  }

  @Get('by-code/:code')
  @Permissions(PERMISSIONS.PROMPTS.READ)
  @ApiOperation({ summary: 'Get Prompt by code' })
  @ApiOkResponse({ type: PromptResponseDto })
  async findByCode(
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PromptResponseDto> {
    return this.promptsService.findByCode(code, user.permissions);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PROMPTS.READ)
  @ApiOperation({ summary: 'Get Prompt by id' })
  @ApiOkResponse({ type: PromptResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PromptResponseDto> {
    return this.promptsService.findById(id, user.permissions);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.PROMPTS.UPDATE)
  @ApiOperation({ summary: 'Update Prompt metadata or draft version content' })
  @ApiOkResponse({ type: PromptResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto,
  ): Promise<PromptResponseDto> {
    return this.promptsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PROMPTS.DELETE)
  @ApiOperation({ summary: 'Soft-delete (archive) Prompt' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.promptsService.softDelete(id);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.PROMPTS.PUBLISH)
  @ApiOperation({ summary: 'Publish current draft version' })
  @ApiOkResponse({ type: PromptResponseDto })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<PromptResponseDto> {
    return this.promptsService.publish(id);
  }

  @Post(':id/enable')
  @Permissions(PERMISSIONS.PROMPTS.UPDATE)
  @ApiOperation({ summary: 'Enable Prompt' })
  @ApiOkResponse({ type: PromptResponseDto })
  async enable(@Param('id', ParseUUIDPipe) id: string): Promise<PromptResponseDto> {
    return this.promptsService.enable(id);
  }

  @Post(':id/disable')
  @Permissions(PERMISSIONS.PROMPTS.UPDATE)
  @ApiOperation({ summary: 'Disable Prompt' })
  @ApiOkResponse({ type: PromptResponseDto })
  async disable(@Param('id', ParseUUIDPipe) id: string): Promise<PromptResponseDto> {
    return this.promptsService.disable(id);
  }

  @Get(':id/versions')
  @Permissions(PERMISSIONS.PROMPTS.READ)
  @ApiOperation({ summary: 'List Prompt versions' })
  async listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: PromptVersionResponseDto[] }> {
    return this.promptsService.listVersions(id, user.permissions);
  }

  @Post(':id/versions')
  @Permissions(PERMISSIONS.PROMPTS.UPDATE)
  @ApiOperation({ summary: 'Create new draft version from current published' })
  @ApiCreatedResponse({ type: PromptVersionResponseDto })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePromptVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PromptVersionResponseDto> {
    return this.promptsService.createVersion(id, dto ?? {}, user.sub);
  }

  @Get(':id/versions/:version')
  @Permissions(PERMISSIONS.PROMPTS.READ)
  @ApiOperation({ summary: 'Get specific Prompt version' })
  @ApiOkResponse({ type: PromptVersionResponseDto })
  async getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<PromptVersionResponseDto> {
    return this.promptsService.getVersion(id, version, user.permissions);
  }
}
