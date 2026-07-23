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

import { CreateToolDto } from '../dto/create-tool.dto';
import { CreateToolVersionDto } from '../dto/create-tool-version.dto';
import { ListToolsQueryDto } from '../dto/list-tools-query.dto';
import { SearchProviderDto } from '../dto/search-provider.dto';
import { ToolResponseDto } from '../dto/tool-response.dto';
import { ToolVersionResponseDto } from '../dto/tool-version-response.dto';
import { UpdateToolDto } from '../dto/update-tool.dto';
import { SearchProviderCatalogService } from '../services/search-provider-catalog.service';
import { ToolsService } from '../services/tools.service';

@ApiTags('Tools')
@ApiBearerAuth('JWT')
@Controller({ path: 'tools', version: '1' })
export class ToolsController {
  constructor(
    private readonly toolsService: ToolsService,
    private readonly searchProviderCatalog: SearchProviderCatalogService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({ summary: 'List Tools' })
  async list(
    @Query() query: ListToolsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: ToolResponseDto[]; meta: Record<string, number> }> {
    return this.toolsService.list(query, user.permissions);
  }

  @Get('search-providers')
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({
    summary: 'List web-search providers (static allowlist for Tool config UI)',
  })
  @ApiOkResponse({ type: [SearchProviderDto] })
  listSearchProviders(): SearchProviderDto[] {
    return this.searchProviderCatalog.listProviders();
  }

  @Post()
  @Permissions(PERMISSIONS.TOOLS.CREATE)
  @ApiOperation({ summary: 'Register draft Tool' })
  @ApiCreatedResponse({ type: ToolResponseDto })
  async create(
    @Body() dto: CreateToolDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.create(dto, user.sub);
  }

  @Get('by-code/:code')
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({ summary: 'Get Tool by code' })
  @ApiOkResponse({ type: ToolResponseDto })
  async findByCode(
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.findByCode(code, user.permissions);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({ summary: 'Get Tool by id' })
  @ApiOkResponse({ type: ToolResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.findById(id, user.permissions);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.TOOLS.UPDATE)
  @ApiOperation({ summary: 'Update Tool metadata or draft version config' })
  @ApiOkResponse({ type: ToolResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToolDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.TOOLS.DELETE)
  @ApiOperation({ summary: 'Soft-delete (archive) Tool' })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.toolsService.softDelete(id, user.sub);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.TOOLS.PUBLISH)
  @ApiOperation({ summary: 'Publish current draft version' })
  @ApiOkResponse({ type: ToolResponseDto })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.publish(id, user.sub);
  }

  @Post(':id/enable')
  @Permissions(PERMISSIONS.TOOLS.UPDATE)
  @ApiOperation({ summary: 'Enable Tool' })
  @ApiOkResponse({ type: ToolResponseDto })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.enable(id, user.sub);
  }

  @Post(':id/disable')
  @Permissions(PERMISSIONS.TOOLS.UPDATE)
  @ApiOperation({ summary: 'Disable Tool' })
  @ApiOkResponse({ type: ToolResponseDto })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolResponseDto> {
    return this.toolsService.disable(id, user.sub);
  }

  @Get(':id/versions')
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({ summary: 'List Tool versions' })
  async listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: ToolVersionResponseDto[] }> {
    return this.toolsService.listVersions(id, user.permissions);
  }

  @Post(':id/versions')
  @Permissions(PERMISSIONS.TOOLS.UPDATE)
  @ApiOperation({ summary: 'Create new draft version from current published' })
  @ApiCreatedResponse({ type: ToolVersionResponseDto })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateToolVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolVersionResponseDto> {
    return this.toolsService.createVersion(id, dto ?? {}, user.sub);
  }

  @Get(':id/versions/:version')
  @Permissions(PERMISSIONS.TOOLS.READ)
  @ApiOperation({ summary: 'Get specific Tool version' })
  @ApiOkResponse({ type: ToolVersionResponseDto })
  async getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ToolVersionResponseDto> {
    return this.toolsService.getVersion(id, version, user.permissions);
  }
}
