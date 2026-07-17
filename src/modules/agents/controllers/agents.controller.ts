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

import { AgentResponseDto } from '../dto/agent-response.dto';
import { AgentVersionResponseDto } from '../dto/agent-version-response.dto';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { CreateAgentVersionDto } from '../dto/create-agent-version.dto';
import { ListAgentsQueryDto } from '../dto/list-agents-query.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentsService } from '../services/agents.service';

@ApiTags('Agents')
@ApiBearerAuth('JWT')
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'List Agents' })
  async list(
    @Query() query: ListAgentsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: AgentResponseDto[]; meta: Record<string, number> }> {
    return this.agentsService.list(query, user.permissions);
  }

  @Post()
  @Permissions(PERMISSIONS.AGENTS.CREATE)
  @ApiOperation({ summary: 'Register draft Agent' })
  @ApiCreatedResponse({ type: AgentResponseDto })
  async create(
    @Body() dto: CreateAgentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AgentResponseDto> {
    return this.agentsService.create(dto, user.sub);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'Get Agent by id' })
  @ApiOkResponse({ type: AgentResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<AgentResponseDto> {
    return this.agentsService.findById(id, user.permissions);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.AGENTS.UPDATE)
  @ApiOperation({ summary: 'Update Agent metadata or draft version config' })
  @ApiOkResponse({ type: AgentResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ): Promise<AgentResponseDto> {
    return this.agentsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.AGENTS.DELETE)
  @ApiOperation({ summary: 'Soft-delete (archive) Agent' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.agentsService.softDelete(id);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.AGENTS.PUBLISH)
  @ApiOperation({ summary: 'Publish current draft version' })
  @ApiOkResponse({ type: AgentResponseDto })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<AgentResponseDto> {
    return this.agentsService.publish(id);
  }

  @Post(':id/enable')
  @Permissions(PERMISSIONS.AGENTS.UPDATE)
  @ApiOperation({ summary: 'Enable Agent' })
  @ApiOkResponse({ type: AgentResponseDto })
  async enable(@Param('id', ParseUUIDPipe) id: string): Promise<AgentResponseDto> {
    return this.agentsService.enable(id);
  }

  @Post(':id/disable')
  @Permissions(PERMISSIONS.AGENTS.UPDATE)
  @ApiOperation({ summary: 'Disable Agent' })
  @ApiOkResponse({ type: AgentResponseDto })
  async disable(@Param('id', ParseUUIDPipe) id: string): Promise<AgentResponseDto> {
    return this.agentsService.disable(id);
  }

  @Get(':id/versions')
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'List Agent versions' })
  async listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: AgentVersionResponseDto[] }> {
    return this.agentsService.listVersions(id, user.permissions);
  }

  @Post(':id/versions')
  @Permissions(PERMISSIONS.AGENTS.UPDATE)
  @ApiOperation({ summary: 'Create new draft version from current published' })
  @ApiCreatedResponse({ type: AgentVersionResponseDto })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAgentVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AgentVersionResponseDto> {
    return this.agentsService.createVersion(id, dto ?? {}, user.sub);
  }

  @Get(':id/versions/:version')
  @Permissions(PERMISSIONS.AGENTS.READ)
  @ApiOperation({ summary: 'Get specific Agent version' })
  @ApiOkResponse({ type: AgentVersionResponseDto })
  async getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<AgentVersionResponseDto> {
    return this.agentsService.getVersion(id, version, user.permissions);
  }
}
