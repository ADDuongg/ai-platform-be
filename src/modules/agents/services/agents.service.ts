import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';
import { assertJsonPayloadSize, canSeeCatalogDrafts } from '@common/utils';

import { AuditAction, AuditDomain } from '@modules/audit/constants/audit.constants';
import { AuditLogService } from '@modules/audit/services/audit-log.service';
import { LlmCatalogService } from '@modules/llm/services/llm-catalog.service';
import { PromptsService } from '@modules/prompts/services/prompts.service';
import { ToolsService } from '@modules/tools/services/tools.service';

import { AgentResponseDto } from '../dto/agent-response.dto';
import { AgentVersionResponseDto } from '../dto/agent-version-response.dto';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { CreateAgentVersionDto } from '../dto/create-agent-version.dto';
import { ListAgentsQueryDto } from '../dto/list-agents-query.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentEntity } from '../entities/agent.entity';
import { AgentVersionEntity } from '../entities/agent-version.entity';
import { AgentStatus, AgentVersionStatus } from '../enums';
import { AgentVersionsRepository } from '../repositories/agent-versions.repository';
import { AgentsRepository } from '../repositories/agents.repository';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 0;

@Injectable()
export class AgentsService {
  constructor(
    private readonly agentsRepository: AgentsRepository,
    private readonly agentVersionsRepository: AgentVersionsRepository,
    private readonly promptsService: PromptsService,
    private readonly toolsService: ToolsService,
    private readonly llmCatalogService: LlmCatalogService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateAgentDto, actorId: string): Promise<AgentResponseDto> {
    const code = dto.code.trim().toLowerCase();
    assertJsonPayloadSize(dto.inputSchema, 'inputSchema');
    assertJsonPayloadSize(dto.outputSchema, 'outputSchema');
    if (dto.config) {
      assertJsonPayloadSize(dto.config, 'config');
      this.llmCatalogService.assertValidProviderModel(dto.config);
    }

    const existing = await this.agentsRepository.findByCode(code);
    if (existing) {
      throw new AppException('Agent code already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.AGENT_CODE_EXISTS,
      });
    }

    await this.validatePromptRef(dto.promptRef);
    await this.validateToolRefs(dto.toolRefs);

    const result = await this.agentsRepository.withTransaction(async (manager) => {
      const agentRepo = manager.getRepository(AgentEntity);
      const versionRepo = manager.getRepository(AgentVersionEntity);

      const savedAgent = await agentRepo.save(
        agentRepo.create({
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          capabilityType: dto.capabilityType,
          status: AgentStatus.DRAFT,
          enabled: true,
          currentVersion: null,
          createdBy: actorId,
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          agentId: savedAgent.id,
          version: 1,
          status: AgentVersionStatus.DRAFT,
          inputSchema: dto.inputSchema,
          outputSchema: dto.outputSchema,
          configJson: dto.config ?? {},
          timeoutMs: dto.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          maxRetries: dto.maxRetries ?? DEFAULT_MAX_RETRIES,
          promptRef: dto.promptRef ?? null,
          toolRefs: dto.toolRefs ?? [],
          changelog: dto.changelog ?? null,
          publishedAt: null,
          createdBy: actorId,
        }),
      );

      return this.toAgentDto(savedAgent, 1);
    });

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: AuditAction.CREATED,
      resourceType: 'agent',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId,
      metadata: { capabilityType: result.capabilityType },
    });

    return result;
  }

  async list(
    query: ListAgentsQueryDto,
    permissions: string[],
  ): Promise<{ data: AgentResponseDto[]; meta: Record<string, number> }> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const [agents, total] = await this.agentsRepository.findManyFiltered({
      status: includeDrafts ? query.status : undefined,
      capabilityType: query.capabilityType,
      enabled: query.enabled,
      includeDrafts,
      page,
      limit,
    });

    const data = await Promise.all(
      agents.map((agent) => this.toAgentDtoWithDraft(agent, includeDrafts)),
    );

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, permissions: string[]): Promise<AgentResponseDto> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const agent = await this.agentsRepository.findById(id);
    if (!agent || (!includeDrafts && agent.status !== AgentStatus.PUBLISHED)) {
      throw new AppException('Agent not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.AGENT_NOT_FOUND,
      });
    }

    return this.toAgentDtoWithDraft(agent, includeDrafts);
  }

  /** Soft-deleted agents are excluded by repository; status/enabled still matter for assignability. */
  async assertAssignableByCode(code: string): Promise<AgentEntity> {
    const normalized = code.trim().toLowerCase();
    const agent = await this.agentsRepository.findByCode(normalized);
    if (
      !agent ||
      agent.deletedAt != null ||
      agent.status !== AgentStatus.PUBLISHED ||
      !agent.enabled
    ) {
      throw new AppException(
        'Agent is not assignable (must exist, be published, and enabled)',
        HttpStatus.BAD_REQUEST,
        {
          code: ERROR_CODES.WORKFLOW_INVALID_AGENT_REF,
          details: { agentCode: normalized },
        },
      );
    }
    return agent;
  }

  async update(id: string, dto: UpdateAgentDto, actorId?: string): Promise<AgentResponseDto> {
    const agent = await this.requireMutableAgent(id);
    const hasConfigChange = this.hasConfigFields(dto);

    if (dto.name !== undefined) {
      agent.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      agent.description = dto.description.trim() || null;
    }
    if (dto.capabilityType !== undefined) {
      agent.capabilityType = dto.capabilityType;
    }

    let draft: AgentVersionEntity | null = null;
    let llmChange: {
      before: { provider: unknown; model: unknown };
      after: { provider: unknown; model: unknown };
    } | null = null;

    if (hasConfigChange) {
      if (dto.inputSchema) {
        assertJsonPayloadSize(dto.inputSchema, 'inputSchema');
      }
      if (dto.outputSchema) {
        assertJsonPayloadSize(dto.outputSchema, 'outputSchema');
      }
      if (dto.config) {
        assertJsonPayloadSize(dto.config, 'config');
        this.llmCatalogService.assertValidProviderModel(dto.config);
      }

      await this.validatePromptRef(dto.promptRef);
      await this.validateToolRefs(dto.toolRefs);

      draft = await this.agentVersionsRepository.findDraftByAgentId(agent.id);
      if (!draft) {
        throw new AppException(
          'No draft version to update; create a new version first',
          HttpStatus.CONFLICT,
          { code: ERROR_CODES.AGENT_NO_DRAFT_TO_PUBLISH },
        );
      }

      if (dto.config !== undefined) {
        const beforeProvider = draft.configJson?.provider;
        const beforeModel = draft.configJson?.model;
        const afterProvider = dto.config.provider;
        const afterModel = dto.config.model;
        if (beforeProvider !== afterProvider || beforeModel !== afterModel) {
          llmChange = {
            before: { provider: beforeProvider, model: beforeModel },
            after: { provider: afterProvider, model: afterModel },
          };
        }
      }

      this.applyConfigToVersion(draft, dto);
      await this.agentVersionsRepository.save(draft);
    }

    await this.agentsRepository.save(agent);
    if (!draft) {
      draft = await this.agentVersionsRepository.findDraftByAgentId(agent.id);
    }
    const result = this.toAgentDto(agent, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: AuditAction.UPDATED,
      resourceType: 'agent',
      resourceId: agent.id,
      resourceCode: agent.code,
      actorUserId: actorId ?? null,
      metadata: { draftVersion: draft?.version ?? null },
    });

    if (llmChange) {
      await this.auditLogService.record({
        domain: AuditDomain.AGENT,
        action: AuditAction.LLM_CONFIG_CHANGED,
        resourceType: 'agent',
        resourceId: agent.id,
        resourceCode: agent.code,
        actorUserId: actorId ?? null,
        metadata: llmChange,
      });
    }

    return result;
  }

  async publish(id: string, actorId?: string): Promise<AgentResponseDto> {
    const agent = await this.requireMutableAgent(id);

    const result = await this.agentsRepository.withTransaction(async (manager) => {
      const agentRepo = manager.getRepository(AgentEntity);
      const versionRepo = manager.getRepository(AgentVersionEntity);

      const lockedAgent = await agentRepo.findOne({ where: { id: agent.id } });
      if (!lockedAgent || lockedAgent.status === AgentStatus.ARCHIVED) {
        throw new AppException('Agent not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.AGENT_NOT_FOUND,
        });
      }

      const draft = await versionRepo.findOne({
        where: { agentId: lockedAgent.id, status: AgentVersionStatus.DRAFT },
      });
      if (!draft) {
        throw new AppException('No draft version to publish', HttpStatus.CONFLICT, {
          code: ERROR_CODES.AGENT_NO_DRAFT_TO_PUBLISH,
        });
      }

      this.assertPublishableSchemas(draft.inputSchema, draft.outputSchema);

      draft.status = AgentVersionStatus.PUBLISHED;
      draft.publishedAt = new Date();
      if (draft.timeoutMs == null) {
        draft.timeoutMs = DEFAULT_TIMEOUT_MS;
      }
      if (draft.maxRetries == null) {
        draft.maxRetries = DEFAULT_MAX_RETRIES;
      }
      await versionRepo.save(draft);

      lockedAgent.status = AgentStatus.PUBLISHED;
      lockedAgent.currentVersion = draft.version;
      await agentRepo.save(lockedAgent);

      return this.toAgentDto(lockedAgent, null);
    });

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: AuditAction.PUBLISHED,
      resourceType: 'agent',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId ?? null,
      metadata: { version: result.currentVersion },
    });

    return result;
  }

  async createVersion(
    id: string,
    dto: CreateAgentVersionDto,
    actorId: string,
  ): Promise<AgentVersionResponseDto> {
    const agent = await this.requireMutableAgent(id);
    if (agent.status !== AgentStatus.PUBLISHED || agent.currentVersion == null) {
      throw new AppException(
        'Only published agents can create a new draft version',
        HttpStatus.CONFLICT,
        { code: ERROR_CODES.AGENT_INVALID_STATE },
      );
    }

    const existingDraft = await this.agentVersionsRepository.findDraftByAgentId(agent.id);
    if (existingDraft) {
      throw new AppException('A draft version already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.AGENT_DRAFT_VERSION_EXISTS,
      });
    }

    const current = await this.agentVersionsRepository.findByAgentAndVersion(
      agent.id,
      agent.currentVersion,
    );
    if (!current || current.status !== AgentVersionStatus.PUBLISHED) {
      throw new AppException('Current published version not found', HttpStatus.CONFLICT, {
        code: ERROR_CODES.AGENT_INVALID_STATE,
      });
    }

    const nextVersion = (await this.agentVersionsRepository.getMaxVersion(agent.id)) + 1;
    const draft = await this.agentVersionsRepository.createAndSave({
      agentId: agent.id,
      version: nextVersion,
      status: AgentVersionStatus.DRAFT,
      inputSchema: current.inputSchema,
      outputSchema: current.outputSchema,
      configJson: current.configJson,
      timeoutMs: current.timeoutMs,
      maxRetries: current.maxRetries,
      promptRef: current.promptRef,
      toolRefs: [...current.toolRefs],
      changelog: dto.changelog ?? null,
      publishedAt: null,
      createdBy: actorId,
    });

    const result = this.toVersionDto(draft);

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: AuditAction.CREATED,
      resourceType: 'agent_version',
      resourceId: agent.id,
      resourceCode: agent.code,
      actorUserId: actorId,
      metadata: { version: draft.version },
    });

    return result;
  }

  async listVersions(
    id: string,
    permissions: string[],
  ): Promise<{ data: AgentVersionResponseDto[] }> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const versions = await this.agentVersionsRepository.findAllByAgentId(id, includeDrafts);
    return { data: versions.map((version) => this.toVersionDto(version)) };
  }

  async getVersion(
    id: string,
    version: number,
    permissions: string[],
  ): Promise<AgentVersionResponseDto> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const row = await this.agentVersionsRepository.findByAgentAndVersion(id, version);
    if (!row || (!includeDrafts && row.status !== AgentVersionStatus.PUBLISHED)) {
      throw new AppException('Agent version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.AGENT_NOT_FOUND,
      });
    }
    return this.toVersionDto(row);
  }

  async enable(id: string, actorId?: string): Promise<AgentResponseDto> {
    return this.setEnabled(id, true, actorId);
  }

  async disable(id: string, actorId?: string): Promise<AgentResponseDto> {
    return this.setEnabled(id, false, actorId);
  }

  async softDelete(id: string, actorId?: string): Promise<{ message: string }> {
    const agent = await this.requireMutableAgent(id);
    agent.status = AgentStatus.ARCHIVED;
    await this.agentsRepository.save(agent);
    await this.agentsRepository.softDelete(id);

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: AuditAction.ARCHIVED,
      resourceType: 'agent',
      resourceId: agent.id,
      resourceCode: agent.code,
      actorUserId: actorId ?? null,
    });

    return { message: 'Agent archived' };
  }

  canSeeDrafts(permissions: string[]): boolean {
    return canSeeCatalogDrafts(permissions, PERMISSIONS.AGENTS.UPDATE);
  }

  private async setEnabled(
    id: string,
    enabled: boolean,
    actorId?: string,
  ): Promise<AgentResponseDto> {
    const agent = await this.requireMutableAgent(id);
    agent.enabled = enabled;
    await this.agentsRepository.save(agent);
    const draft = await this.agentVersionsRepository.findDraftByAgentId(agent.id);
    const result = this.toAgentDto(agent, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.AGENT,
      action: enabled ? AuditAction.ENABLED : AuditAction.DISABLED,
      resourceType: 'agent',
      resourceId: agent.id,
      resourceCode: agent.code,
      actorUserId: actorId ?? null,
    });

    return result;
  }

  private async requireMutableAgent(id: string): Promise<AgentEntity> {
    const agent = await this.agentsRepository.findById(id);
    if (!agent || agent.status === AgentStatus.ARCHIVED) {
      throw new AppException('Agent not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.AGENT_NOT_FOUND,
      });
    }
    return agent;
  }

  private hasConfigFields(dto: UpdateAgentDto): boolean {
    return (
      dto.inputSchema !== undefined ||
      dto.outputSchema !== undefined ||
      dto.config !== undefined ||
      dto.timeoutMs !== undefined ||
      dto.maxRetries !== undefined ||
      dto.promptRef !== undefined ||
      dto.toolRefs !== undefined ||
      dto.changelog !== undefined
    );
  }

  private applyConfigToVersion(version: AgentVersionEntity, dto: UpdateAgentDto): void {
    if (version.status !== AgentVersionStatus.DRAFT) {
      throw new AppException('Published version configuration is immutable', HttpStatus.CONFLICT, {
        code: ERROR_CODES.AGENT_VERSION_IMMUTABLE,
      });
    }
    if (dto.inputSchema !== undefined) {
      version.inputSchema = dto.inputSchema;
    }
    if (dto.outputSchema !== undefined) {
      version.outputSchema = dto.outputSchema;
    }
    if (dto.config !== undefined) {
      version.configJson = dto.config;
    }
    if (dto.timeoutMs !== undefined) {
      version.timeoutMs = dto.timeoutMs;
    }
    if (dto.maxRetries !== undefined) {
      version.maxRetries = dto.maxRetries;
    }
    if (dto.promptRef !== undefined) {
      version.promptRef = dto.promptRef;
    }
    if (dto.toolRefs !== undefined) {
      version.toolRefs = dto.toolRefs;
    }
    if (dto.changelog !== undefined) {
      version.changelog = dto.changelog;
    }
  }

  private assertPublishableSchemas(
    inputSchema: Record<string, unknown>,
    outputSchema: Record<string, unknown>,
  ): void {
    if (!this.isNonEmptyObject(inputSchema) || !this.isNonEmptyObject(outputSchema)) {
      throw new AppException(
        'inputSchema and outputSchema must be non-empty objects to publish',
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.VALIDATION_ERROR },
      );
    }
  }

  private isNonEmptyObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0
    );
  }

  private async toAgentDtoWithDraft(
    agent: AgentEntity,
    includeDrafts: boolean,
  ): Promise<AgentResponseDto> {
    const draft = includeDrafts
      ? await this.agentVersionsRepository.findDraftByAgentId(agent.id)
      : null;
    return this.toAgentDto(agent, draft?.version ?? null);
  }

  private toAgentDto(agent: AgentEntity, draftVersion: number | null): AgentResponseDto {
    return plainToInstance(
      AgentResponseDto,
      {
        ...agent,
        draftVersion,
      },
      { excludeExtraneousValues: true },
    );
  }

  private toVersionDto(version: AgentVersionEntity): AgentVersionResponseDto {
    return plainToInstance(
      AgentVersionResponseDto,
      {
        ...version,
        config: version.configJson,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async validatePromptRef(promptRef: string | null | undefined): Promise<void> {
    if (promptRef === undefined) return;
    if (promptRef === null || promptRef.trim() === '') return;
    await this.promptsService.assertAssignableByCode(promptRef);
  }

  private async validateToolRefs(toolRefs: string[] | undefined): Promise<void> {
    if (toolRefs === undefined) return;
    if (toolRefs.length === 0) return;
    await this.toolsService.assertAssignableByCodes(toolRefs);
  }
}
