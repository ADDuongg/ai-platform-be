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

import { CloneWorkflowDto } from '../dto/clone-workflow.dto';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { CreateWorkflowVersionDto } from '../dto/create-workflow-version.dto';
import { ListWorkflowsQueryDto } from '../dto/list-workflows-query.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { WorkflowResponseDto } from '../dto/workflow-response.dto';
import { WorkflowVersionResponseDto } from '../dto/workflow-version-response.dto';
import { WorkflowsService } from '../services/workflows.service';

@ApiTags('Workflows')
@ApiBearerAuth('JWT')
@Controller({ path: 'workflows', version: '1' })
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @ApiOperation({ summary: 'List Workflows' })
  async list(
    @Query() query: ListWorkflowsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: WorkflowResponseDto[]; meta: Record<string, number> }> {
    return this.workflowsService.list(query, user.permissions);
  }

  @Post()
  @Permissions(PERMISSIONS.WORKFLOWS.CREATE)
  @ApiOperation({ summary: 'Create draft Workflow' })
  @ApiCreatedResponse({ type: WorkflowResponseDto })
  async create(
    @Body() dto: CreateWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.create(dto, user.sub);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @ApiOperation({ summary: 'Get Workflow by id' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.findById(id, user.permissions);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Update Workflow metadata or draft definition' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.WORKFLOWS.DELETE)
  @ApiOperation({ summary: 'Soft-delete (archive) Workflow' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.workflowsService.softDelete(id);
  }

  @Post(':id/publish')
  @Permissions(PERMISSIONS.WORKFLOWS.PUBLISH)
  @ApiOperation({ summary: 'Publish current draft version' })
  @ApiOkResponse({ type: WorkflowResponseDto })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<WorkflowResponseDto> {
    return this.workflowsService.publish(id);
  }

  @Post(':id/clone')
  @Permissions(PERMISSIONS.WORKFLOWS.CREATE)
  @ApiOperation({ summary: 'Clone Workflow into a new draft' })
  @ApiCreatedResponse({ type: WorkflowResponseDto })
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneWorkflowDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.clone(id, dto, user.sub, user.permissions);
  }

  @Get(':id/versions')
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @ApiOperation({ summary: 'List Workflow versions' })
  async listVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ data: WorkflowVersionResponseDto[] }> {
    return this.workflowsService.listVersions(id, user.permissions);
  }

  @Post(':id/versions')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Create new draft version from current published' })
  @ApiCreatedResponse({ type: WorkflowVersionResponseDto })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkflowVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowVersionResponseDto> {
    return this.workflowsService.createVersion(id, dto ?? {}, user.sub);
  }

  @Get(':id/versions/:version')
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @ApiOperation({ summary: 'Get specific Workflow version' })
  @ApiOkResponse({ type: WorkflowVersionResponseDto })
  async getVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowVersionResponseDto> {
    return this.workflowsService.getVersion(id, version, user.permissions);
  }
}
