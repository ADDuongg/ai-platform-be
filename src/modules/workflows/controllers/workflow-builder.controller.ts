import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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

import { AddWorkflowEdgeDto } from '../dto/add-workflow-edge.dto';
import { AddWorkflowNodeDto } from '../dto/add-workflow-node.dto';
import { ReplaceWorkflowDefinitionDto } from '../dto/replace-workflow-definition.dto';
import { UpdateWorkflowNodeDto } from '../dto/update-workflow-node.dto';
import { ValidateWorkflowDefinitionDto } from '../dto/validate-workflow-definition.dto';
import {
  WorkflowDefinitionResponseDto,
  WorkflowDefinitionValidationResponseDto,
} from '../dto/workflow-definition-response.dto';
import { WorkflowBuilderService } from '../services/workflow-builder.service';

@ApiTags('Workflow Builder')
@ApiBearerAuth('JWT')
@Controller({ path: 'workflows', version: '1' })
export class WorkflowBuilderController {
  constructor(private readonly workflowBuilderService: WorkflowBuilderService) {}

  @Get(':id/definition')
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @ApiOperation({ summary: 'Get Workflow definition (draft for mutate roles, else published)' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async getDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.getDefinition(id, user.permissions);
  }

  @Put(':id/definition')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Replace entire draft definition' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async replaceDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.replaceDefinition(id, dto);
  }

  @Post(':id/definition/validate')
  @Permissions(PERMISSIONS.WORKFLOWS.READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate definition without persisting' })
  @ApiOkResponse({ type: WorkflowDefinitionValidationResponseDto })
  async validateDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateWorkflowDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkflowDefinitionValidationResponseDto> {
    return this.workflowBuilderService.validateDefinition(id, user.permissions, dto ?? {});
  }

  @Post(':id/nodes')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Add agent node to draft definition' })
  @ApiCreatedResponse({ type: WorkflowDefinitionResponseDto })
  async addNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWorkflowNodeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.addNode(id, dto);
  }

  @Patch(':id/nodes/:nodeId')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Update draft node (replace agent / configure mappings)' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async updateNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateWorkflowNodeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.updateNode(id, nodeId, dto);
  }

  @Delete(':id/nodes/:nodeId')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Remove draft node and cascade edges' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async removeNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('nodeId') nodeId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.removeNode(id, nodeId);
  }

  @Post(':id/edges')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Connect two draft nodes' })
  @ApiCreatedResponse({ type: WorkflowDefinitionResponseDto })
  async addEdge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWorkflowEdgeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.addEdge(id, dto);
  }

  @Delete(':id/edges/:edgeId')
  @Permissions(PERMISSIONS.WORKFLOWS.UPDATE)
  @ApiOperation({ summary: 'Remove a draft edge' })
  @ApiOkResponse({ type: WorkflowDefinitionResponseDto })
  async removeEdge(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('edgeId') edgeId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return this.workflowBuilderService.removeEdge(id, edgeId);
  }
}
