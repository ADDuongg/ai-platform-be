import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';

import { AddWorkflowEdgeDto } from '../dto/add-workflow-edge.dto';
import { AddWorkflowNodeDto } from '../dto/add-workflow-node.dto';
import { ReplaceWorkflowDefinitionDto } from '../dto/replace-workflow-definition.dto';
import { UpdateWorkflowNodeDto } from '../dto/update-workflow-node.dto';
import { ValidateWorkflowDefinitionDto } from '../dto/validate-workflow-definition.dto';
import {
  WorkflowDefinitionResponseDto,
  WorkflowDefinitionValidationResponseDto,
} from '../dto/workflow-definition-response.dto';
import { WorkflowVersionEntity } from '../entities/workflow-version.entity';
import { WorkflowEntity } from '../entities/workflow.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '../enums';
import { WorkflowVersionsRepository } from '../repositories/workflow-versions.repository';
import { WorkflowsRepository } from '../repositories/workflows.repository';
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '../types';
import { WorkflowDefinitionValidator } from './workflow-definition.validator';
import { WorkflowsService } from './workflows.service';

@Injectable()
export class WorkflowBuilderService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowVersionsRepository: WorkflowVersionsRepository,
    private readonly workflowsService: WorkflowsService,
    private readonly definitionValidator: WorkflowDefinitionValidator,
  ) {}

  async getDefinition(
    workflowId: string,
    permissions: string[],
  ): Promise<WorkflowDefinitionResponseDto> {
    const workflow = await this.workflowsService.findById(workflowId, permissions);
    const includeDrafts = this.workflowsService.canSeeDrafts(permissions);

    if (includeDrafts) {
      const draft = await this.workflowVersionsRepository.findDraftByWorkflowId(workflowId);
      if (draft) {
        return this.toDefinitionDto(workflowId, draft);
      }
    }

    if (workflow.currentVersion == null) {
      throw new AppException('Workflow definition not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const published = await this.workflowVersionsRepository.findByWorkflowAndVersion(
      workflowId,
      workflow.currentVersion,
    );
    if (!published || published.status !== WorkflowVersionStatus.PUBLISHED) {
      throw new AppException('Workflow definition not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    return this.toDefinitionDto(workflowId, published);
  }

  async replaceDefinition(
    workflowId: string,
    dto: ReplaceWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = await this.definitionValidator.assertValid(dto.definition);
    draft.definitionJson = definition;
    if (dto.changelog !== undefined) {
      draft.changelog = dto.changelog;
    }
    await this.workflowVersionsRepository.save(draft);
    return this.toDefinitionDto(workflowId, draft);
  }

  async addNode(
    workflowId: string,
    dto: AddWorkflowNodeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = this.loadDraftDefinition(draft);

    const nodeId = this.definitionValidator.createId(dto.id);
    if (definition.nodes.some((node) => node.id === nodeId)) {
      throw new AppException('Node id already exists in definition', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        details: { nodeId },
      });
    }

    const node: WorkflowNode = {
      id: nodeId,
      type: 'agent',
      agentCode: dto.agentCode.trim().toLowerCase(),
      agentVersion: dto.agentVersion,
      label: dto.label,
      position: dto.position,
      inputMapping: dto.inputMapping,
      outputMapping: dto.outputMapping,
      timeoutMs: dto.timeoutMs,
      maxRetries: dto.maxRetries,
      config: dto.config,
    };

    definition.nodes.push(node);
    return this.persistDefinition(workflowId, draft, definition);
  }

  async updateNode(
    workflowId: string,
    nodeId: string,
    dto: UpdateWorkflowNodeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = this.loadDraftDefinition(draft);

    const index = definition.nodes.findIndex((node) => node.id === nodeId);
    if (index < 0) {
      throw new AppException('Node not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        details: { nodeId },
      });
    }

    const current = definition.nodes[index];
    const updated: WorkflowNode = {
      ...current,
      agentCode:
        dto.agentCode !== undefined ? dto.agentCode.trim().toLowerCase() : current.agentCode,
      agentVersion: dto.agentVersion !== undefined ? dto.agentVersion : current.agentVersion,
      label: dto.label !== undefined ? dto.label : current.label,
      position: dto.position !== undefined ? dto.position : current.position,
      inputMapping: dto.inputMapping !== undefined ? dto.inputMapping : current.inputMapping,
      outputMapping: dto.outputMapping !== undefined ? dto.outputMapping : current.outputMapping,
      timeoutMs: dto.timeoutMs !== undefined ? dto.timeoutMs : current.timeoutMs,
      maxRetries: dto.maxRetries !== undefined ? dto.maxRetries : current.maxRetries,
      config: dto.config !== undefined ? dto.config : current.config,
    };

    definition.nodes[index] = updated;
    return this.persistDefinition(workflowId, draft, definition);
  }

  async removeNode(workflowId: string, nodeId: string): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = this.loadDraftDefinition(draft);

    if (!definition.nodes.some((node) => node.id === nodeId)) {
      throw new AppException('Node not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        details: { nodeId },
      });
    }

    definition.nodes = definition.nodes.filter((node) => node.id !== nodeId);
    definition.edges = definition.edges.filter(
      (edge) => edge.from !== nodeId && edge.to !== nodeId,
    );

    return this.persistDefinition(workflowId, draft, definition);
  }

  async addEdge(
    workflowId: string,
    dto: AddWorkflowEdgeDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = this.loadDraftDefinition(draft);

    const edge: WorkflowEdge = {
      id: this.definitionValidator.createId(dto.id),
      from: dto.from.trim(),
      to: dto.to.trim(),
      condition: null,
    };

    if (definition.edges.some((existing) => existing.id === edge.id)) {
      throw new AppException('Edge id already exists in definition', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_INVALID_GRAPH,
        details: { edgeId: edge.id },
      });
    }

    definition.edges.push(edge);
    return this.persistDefinition(workflowId, draft, definition);
  }

  async removeEdge(workflowId: string, edgeId: string): Promise<WorkflowDefinitionResponseDto> {
    const draft = await this.requireDraftVersion(workflowId);
    const definition = this.loadDraftDefinition(draft);

    if (!definition.edges.some((edge) => edge.id === edgeId)) {
      throw new AppException('Edge not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        details: { edgeId },
      });
    }

    definition.edges = definition.edges.filter((edge) => edge.id !== edgeId);
    return this.persistDefinition(workflowId, draft, definition);
  }

  async validateDefinition(
    workflowId: string,
    permissions: string[],
    dto: ValidateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionValidationResponseDto> {
    if (dto.definition !== undefined && !permissions.includes(PERMISSIONS.WORKFLOWS.UPDATE)) {
      throw new AppException('Insufficient permissions', HttpStatus.FORBIDDEN, {
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      });
    }

    let candidate: unknown = dto.definition;
    if (candidate === undefined) {
      const current = await this.getDefinition(workflowId, permissions);
      candidate = current.definition;
    } else {
      await this.workflowsService.findById(workflowId, permissions);
    }

    const result = await this.definitionValidator.validate(candidate, { checkAgents: true });
    return plainToInstance(
      WorkflowDefinitionValidationResponseDto,
      { valid: result.valid, errors: result.errors },
      { excludeExtraneousValues: true },
    );
  }

  private loadDraftDefinition(draft: WorkflowVersionEntity): WorkflowDefinition {
    return this.definitionValidator.cloneDefinition(
      this.definitionValidator.coerceLoose(draft.definitionJson),
    );
  }

  private async persistDefinition(
    workflowId: string,
    draft: WorkflowVersionEntity,
    definition: WorkflowDefinition,
  ): Promise<WorkflowDefinitionResponseDto> {
    draft.definitionJson = await this.definitionValidator.assertValid(definition);
    await this.workflowVersionsRepository.save(draft);
    return this.toDefinitionDto(workflowId, draft);
  }

  private async requireDraftVersion(workflowId: string): Promise<WorkflowVersionEntity> {
    const workflow = await this.requireMutableWorkflow(workflowId);
    const draft = await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id);
    if (!draft) {
      throw new AppException(
        'No draft version to update; create a new version first',
        HttpStatus.CONFLICT,
        { code: ERROR_CODES.WORKFLOW_NO_DRAFT_TO_PUBLISH },
      );
    }
    if (draft.status !== WorkflowVersionStatus.DRAFT) {
      throw new AppException('Published version definition is immutable', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_VERSION_IMMUTABLE,
      });
    }
    return draft;
  }

  private async requireMutableWorkflow(id: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowsRepository.findById(id);
    if (!workflow || workflow.status === WorkflowStatus.ARCHIVED) {
      throw new AppException('Workflow not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }
    return workflow;
  }

  private toDefinitionDto(
    workflowId: string,
    version: WorkflowVersionEntity,
  ): WorkflowDefinitionResponseDto {
    const definition: WorkflowDefinition = this.definitionValidator.coerceLoose(
      version.definitionJson,
    );
    return plainToInstance(
      WorkflowDefinitionResponseDto,
      {
        workflowId,
        version: version.version,
        versionStatus: version.status,
        definition,
      },
      { excludeExtraneousValues: true },
    );
  }
}
