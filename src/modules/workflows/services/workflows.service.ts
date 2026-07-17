import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';
import { assertDefinitionJsonPayloadSize, canSeeCatalogDrafts } from '@common/utils';

import { CloneWorkflowDto } from '../dto/clone-workflow.dto';
import { CreateWorkflowDto } from '../dto/create-workflow.dto';
import { CreateWorkflowVersionDto } from '../dto/create-workflow-version.dto';
import { ListWorkflowsQueryDto } from '../dto/list-workflows-query.dto';
import { UpdateWorkflowDto } from '../dto/update-workflow.dto';
import { WorkflowResponseDto } from '../dto/workflow-response.dto';
import { WorkflowVersionResponseDto } from '../dto/workflow-version-response.dto';
import { WorkflowDefinition, WorkflowVersionEntity } from '../entities/workflow-version.entity';
import { WorkflowEntity } from '../entities/workflow.entity';
import { WorkflowStatus, WorkflowVersionStatus } from '../enums';
import { WorkflowVersionsRepository } from '../repositories/workflow-versions.repository';
import { WorkflowsRepository } from '../repositories/workflows.repository';

export const EMPTY_WORKFLOW_DEFINITION: WorkflowDefinition = {
  nodes: [],
  edges: [],
  variables: {},
  policies: {},
};

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly workflowVersionsRepository: WorkflowVersionsRepository,
  ) {}

  async create(dto: CreateWorkflowDto, actorId: string): Promise<WorkflowResponseDto> {
    const code = dto.code.trim().toLowerCase();
    // Loose coerce only; WorkflowDefinitionValidator owns strict graph parsing.
    const definition = this.coerceDefinition(dto.definition);
    assertDefinitionJsonPayloadSize(definition);

    const existing = await this.workflowsRepository.findByCode(code);
    if (existing) {
      throw new AppException('Workflow code already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_CODE_EXISTS,
      });
    }

    return this.workflowsRepository.withTransaction(async (manager) => {
      const workflowRepo = manager.getRepository(WorkflowEntity);
      const versionRepo = manager.getRepository(WorkflowVersionEntity);

      const savedWorkflow = await workflowRepo.save(
        workflowRepo.create({
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || null,
          tags: dto.tags ?? [],
          status: WorkflowStatus.DRAFT,
          currentVersion: null,
          createdBy: actorId,
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          workflowId: savedWorkflow.id,
          version: 1,
          status: WorkflowVersionStatus.DRAFT,
          definitionJson: definition,
          changelog: dto.changelog ?? null,
          publishedAt: null,
          createdBy: actorId,
        }),
      );

      return this.toWorkflowDto(savedWorkflow, 1);
    });
  }

  async list(
    query: ListWorkflowsQueryDto,
    permissions: string[],
  ): Promise<{ data: WorkflowResponseDto[]; meta: Record<string, number> }> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const [workflows, total] = await this.workflowsRepository.findManyFiltered({
      status: includeDrafts ? query.status : undefined,
      category: query.category,
      includeDrafts,
      page,
      limit,
    });

    const data = await Promise.all(
      workflows.map(async (workflow) => {
        const draft = includeDrafts
          ? await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id)
          : null;
        return this.toWorkflowDto(workflow, draft?.version ?? null);
      }),
    );

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, permissions: string[]): Promise<WorkflowResponseDto> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const workflow = await this.workflowsRepository.findById(id);
    if (!workflow || (!includeDrafts && workflow.status !== WorkflowStatus.PUBLISHED)) {
      throw new AppException('Workflow not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const draft = includeDrafts
      ? await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id)
      : null;
    return this.toWorkflowDto(workflow, draft?.version ?? null);
  }

  async update(id: string, dto: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const workflow = await this.requireMutableWorkflow(id);
    const hasDefinitionChange = dto.definition !== undefined || dto.changelog !== undefined;

    if (dto.name !== undefined) {
      workflow.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      workflow.description = dto.description.trim() || null;
    }
    if (dto.category !== undefined) {
      workflow.category = dto.category.trim() || null;
    }
    if (dto.tags !== undefined) {
      workflow.tags = dto.tags;
    }

    let draft: WorkflowVersionEntity | null = null;
    if (hasDefinitionChange) {
      draft = await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id);
      if (!draft) {
        throw new AppException(
          'No draft version to update; create a new version first',
          HttpStatus.CONFLICT,
          { code: ERROR_CODES.WORKFLOW_NO_DRAFT_TO_PUBLISH },
        );
      }
      this.applyDefinitionToVersion(draft, dto);
      await this.workflowVersionsRepository.save(draft);
    }

    await this.workflowsRepository.save(workflow);
    if (!draft) {
      draft = await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id);
    }
    return this.toWorkflowDto(workflow, draft?.version ?? null);
  }

  async publish(id: string): Promise<WorkflowResponseDto> {
    const workflow = await this.requireMutableWorkflow(id);

    return this.workflowsRepository.withTransaction(async (manager) => {
      const workflowRepo = manager.getRepository(WorkflowEntity);
      const versionRepo = manager.getRepository(WorkflowVersionEntity);

      const locked = await workflowRepo.findOne({ where: { id: workflow.id } });
      if (!locked || locked.status === WorkflowStatus.ARCHIVED) {
        throw new AppException('Workflow not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        });
      }

      const draft = await versionRepo.findOne({
        where: { workflowId: locked.id, status: WorkflowVersionStatus.DRAFT },
      });
      if (!draft) {
        throw new AppException('No draft version to publish', HttpStatus.CONFLICT, {
          code: ERROR_CODES.WORKFLOW_NO_DRAFT_TO_PUBLISH,
        });
      }

      this.assertPublishableDefinition(draft.definitionJson);

      draft.status = WorkflowVersionStatus.PUBLISHED;
      draft.publishedAt = new Date();
      await versionRepo.save(draft);

      locked.status = WorkflowStatus.PUBLISHED;
      locked.currentVersion = draft.version;
      await workflowRepo.save(locked);

      return this.toWorkflowDto(locked, null);
    });
  }

  async createVersion(
    id: string,
    dto: CreateWorkflowVersionDto,
    actorId: string,
  ): Promise<WorkflowVersionResponseDto> {
    const workflow = await this.requireMutableWorkflow(id);
    if (workflow.status !== WorkflowStatus.PUBLISHED || workflow.currentVersion == null) {
      throw new AppException(
        'Only published workflows can create a new draft version',
        HttpStatus.CONFLICT,
        { code: ERROR_CODES.WORKFLOW_INVALID_STATE },
      );
    }

    const existingDraft = await this.workflowVersionsRepository.findDraftByWorkflowId(workflow.id);
    if (existingDraft) {
      throw new AppException('A draft version already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_DRAFT_VERSION_EXISTS,
      });
    }

    const current = await this.workflowVersionsRepository.findByWorkflowAndVersion(
      workflow.id,
      workflow.currentVersion,
    );
    if (!current || current.status !== WorkflowVersionStatus.PUBLISHED) {
      throw new AppException('Current published version not found', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_INVALID_STATE,
      });
    }

    const nextVersion = (await this.workflowVersionsRepository.getMaxVersion(workflow.id)) + 1;
    const draft = await this.workflowVersionsRepository.createAndSave({
      workflowId: workflow.id,
      version: nextVersion,
      status: WorkflowVersionStatus.DRAFT,
      definitionJson: this.cloneDefinition(current.definitionJson),
      changelog: dto.changelog ?? null,
      publishedAt: null,
      createdBy: actorId,
    });

    return this.toVersionDto(draft);
  }

  async listVersions(
    id: string,
    permissions: string[],
  ): Promise<{ data: WorkflowVersionResponseDto[] }> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const versions = await this.workflowVersionsRepository.findAllByWorkflowId(id, includeDrafts);
    return { data: versions.map((version) => this.toVersionDto(version)) };
  }

  async getVersion(
    id: string,
    version: number,
    permissions: string[],
  ): Promise<WorkflowVersionResponseDto> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const row = await this.workflowVersionsRepository.findByWorkflowAndVersion(id, version);
    if (!row || (!includeDrafts && row.status !== WorkflowVersionStatus.PUBLISHED)) {
      throw new AppException('Workflow version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }
    return this.toVersionDto(row);
  }

  async clone(
    id: string,
    dto: CloneWorkflowDto,
    actorId: string,
    permissions: string[],
  ): Promise<WorkflowResponseDto> {
    const source = await this.workflowsRepository.findById(id);
    if (!source || source.status === WorkflowStatus.ARCHIVED) {
      throw new AppException('Workflow not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const includeDrafts = this.canSeeDrafts(permissions);
    if (!includeDrafts && source.status !== WorkflowStatus.PUBLISHED) {
      throw new AppException('Workflow not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const sourceVersion = await this.resolveCloneSourceVersion(source, dto.version, includeDrafts);
    const code = dto.code.trim().toLowerCase();
    const existing = await this.workflowsRepository.findByCode(code);
    if (existing) {
      throw new AppException('Workflow code already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_CODE_EXISTS,
      });
    }

    return this.workflowsRepository.withTransaction(async (manager) => {
      const workflowRepo = manager.getRepository(WorkflowEntity);
      const versionRepo = manager.getRepository(WorkflowVersionEntity);

      const saved = await workflowRepo.save(
        workflowRepo.create({
          code,
          name: (dto.name?.trim() || `${source.name} (copy)`).slice(0, 120),
          description: source.description,
          category: source.category,
          tags: [...source.tags],
          status: WorkflowStatus.DRAFT,
          currentVersion: null,
          createdBy: actorId,
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          workflowId: saved.id,
          version: 1,
          status: WorkflowVersionStatus.DRAFT,
          definitionJson: this.cloneDefinition(sourceVersion.definitionJson),
          changelog: `Cloned from ${source.code} v${sourceVersion.version}`,
          publishedAt: null,
          createdBy: actorId,
        }),
      );

      return this.toWorkflowDto(saved, 1);
    });
  }

  async softDelete(id: string): Promise<{ message: string }> {
    const workflow = await this.requireMutableWorkflow(id);
    workflow.status = WorkflowStatus.ARCHIVED;
    await this.workflowsRepository.save(workflow);
    await this.workflowsRepository.softDelete(id);
    return { message: 'Workflow archived' };
  }

  canSeeDrafts(permissions: string[]): boolean {
    return canSeeCatalogDrafts(permissions, PERMISSIONS.WORKFLOWS.UPDATE);
  }

  private async resolveCloneSourceVersion(
    source: WorkflowEntity,
    requestedVersion: number | undefined,
    includeDrafts: boolean,
  ): Promise<WorkflowVersionEntity> {
    if (requestedVersion != null) {
      const row = await this.workflowVersionsRepository.findByWorkflowAndVersion(
        source.id,
        requestedVersion,
      );
      if (!row || (!includeDrafts && row.status !== WorkflowVersionStatus.PUBLISHED)) {
        throw new AppException('Workflow version not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.WORKFLOW_NOT_FOUND,
        });
      }
      return row;
    }

    if (source.currentVersion != null) {
      const published = await this.workflowVersionsRepository.findByWorkflowAndVersion(
        source.id,
        source.currentVersion,
      );
      if (published) {
        return published;
      }
    }

    if (!includeDrafts) {
      throw new AppException('Workflow version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
      });
    }

    const draft = await this.workflowVersionsRepository.findDraftByWorkflowId(source.id);
    if (!draft) {
      throw new AppException('Workflow version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.WORKFLOW_NOT_FOUND,
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

  private applyDefinitionToVersion(version: WorkflowVersionEntity, dto: UpdateWorkflowDto): void {
    if (version.status !== WorkflowVersionStatus.DRAFT) {
      throw new AppException('Published version definition is immutable', HttpStatus.CONFLICT, {
        code: ERROR_CODES.WORKFLOW_VERSION_IMMUTABLE,
      });
    }
    if (dto.definition !== undefined) {
      // Loose coerce only; WorkflowDefinitionValidator owns strict graph parsing.
      const definition = this.coerceDefinition(dto.definition);
      assertDefinitionJsonPayloadSize(definition);
      version.definitionJson = definition;
    }
    if (dto.changelog !== undefined) {
      version.changelog = dto.changelog;
    }
  }

  private coerceDefinition(input?: Record<string, unknown>): WorkflowDefinition {
    if (!input) {
      return this.cloneDefinition(EMPTY_WORKFLOW_DEFINITION);
    }
    return {
      nodes: Array.isArray(input.nodes) ? [...(input.nodes as WorkflowDefinition['nodes'])] : [],
      edges: Array.isArray(input.edges) ? [...(input.edges as WorkflowDefinition['edges'])] : [],
      variables:
        typeof input.variables === 'object' &&
        input.variables !== null &&
        !Array.isArray(input.variables)
          ? { ...(input.variables as Record<string, unknown>) }
          : {},
      policies:
        typeof input.policies === 'object' &&
        input.policies !== null &&
        !Array.isArray(input.policies)
          ? { ...(input.policies as Record<string, unknown>) }
          : {},
    };
  }

  private cloneDefinition(definition: WorkflowDefinition): WorkflowDefinition {
    return {
      nodes: definition.nodes.map((node) => ({ ...node })),
      edges: definition.edges.map((edge) => ({ ...edge })),
      variables: { ...definition.variables },
      policies: { ...definition.policies },
    };
  }

  private assertPublishableDefinition(definition: WorkflowDefinition): void {
    if (!definition || typeof definition !== 'object') {
      throw new AppException('definition must be an object to publish', HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }
    if (!Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) {
      throw new AppException(
        'definition.nodes and definition.edges must be arrays',
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.VALIDATION_ERROR },
      );
    }
  }

  private toWorkflowDto(
    workflow: WorkflowEntity,
    draftVersion: number | null,
  ): WorkflowResponseDto {
    return plainToInstance(
      WorkflowResponseDto,
      {
        ...workflow,
        draftVersion,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toVersionDto(version: WorkflowVersionEntity): WorkflowVersionResponseDto {
    return plainToInstance(
      WorkflowVersionResponseDto,
      {
        ...version,
        definition: version.definitionJson,
      },
      { excludeExtraneousValues: true },
    );
  }
}
