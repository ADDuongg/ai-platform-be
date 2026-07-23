import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';
import { assertJsonPayloadSize, canSeeCatalogDrafts } from '@common/utils';

import { AuditAction, AuditDomain } from '@modules/audit/constants/audit.constants';
import { AuditLogService } from '@modules/audit/services/audit-log.service';

import { CreatePromptDto } from '../dto/create-prompt.dto';
import { CreatePromptVersionDto } from '../dto/create-prompt-version.dto';
import { ListPromptsQueryDto } from '../dto/list-prompts-query.dto';
import { PromptResponseDto } from '../dto/prompt-response.dto';
import { PromptVersionResponseDto } from '../dto/prompt-version-response.dto';
import { UpdatePromptDto } from '../dto/update-prompt.dto';
import { PromptEntity } from '../entities/prompt.entity';
import { PromptVersionEntity } from '../entities/prompt-version.entity';
import { PromptStatus, PromptVersionStatus } from '../enums';
import { PromptsRepository } from '../repositories/prompts.repository';
import { PromptVersionsRepository } from '../repositories/prompt-versions.repository';

@Injectable()
export class PromptsService {
  constructor(
    private readonly promptsRepository: PromptsRepository,
    private readonly promptVersionsRepository: PromptVersionsRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreatePromptDto, actorId: string): Promise<PromptResponseDto> {
    const code = dto.code.trim().toLowerCase();
    assertJsonPayloadSize(dto.template, 'template', { skipNull: true });
    assertJsonPayloadSize(dto.messages, 'messages', { skipNull: true });
    assertJsonPayloadSize(dto.variablesSchema, 'variablesSchema', { skipNull: true });
    assertJsonPayloadSize(dto.modelHints, 'modelHints', { skipNull: true });

    const existing = await this.promptsRepository.findByCode(code);
    if (existing) {
      throw new AppException('Prompt code already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.PROMPT_CODE_EXISTS,
      });
    }

    const result = await this.promptsRepository.withTransaction(async (manager) => {
      const promptRepo = manager.getRepository(PromptEntity);
      const versionRepo = manager.getRepository(PromptVersionEntity);

      const savedPrompt = await promptRepo.save(
        promptRepo.create({
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          category: dto.category ?? null,
          tags: dto.tags ?? [],
          status: PromptStatus.DRAFT,
          enabled: true,
          currentVersion: null,
          createdBy: actorId,
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          promptId: savedPrompt.id,
          version: 1,
          status: PromptVersionStatus.DRAFT,
          template: dto.template ?? null,
          messages: dto.messages ?? null,
          variablesSchema: dto.variablesSchema ?? {},
          modelHints: dto.modelHints ?? {},
          changelog: dto.changelog ?? null,
          publishedAt: null,
          createdBy: actorId,
        }),
      );

      return this.toPromptDto(savedPrompt, 1);
    });

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: AuditAction.CREATED,
      resourceType: 'prompt',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId,
    });

    return result;
  }

  async list(
    query: ListPromptsQueryDto,
    permissions: string[],
  ): Promise<{ data: PromptResponseDto[]; meta: Record<string, number> }> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const [prompts, total] = await this.promptsRepository.findManyFiltered({
      status: includeDrafts ? query.status : undefined,
      category: query.category,
      tag: query.tag,
      enabled: query.enabled,
      includeDrafts,
      page,
      limit,
    });

    const data = await Promise.all(
      prompts.map(async (prompt) => {
        const draft = includeDrafts
          ? await this.promptVersionsRepository.findDraftByPromptId(prompt.id)
          : null;
        return this.toPromptDto(prompt, draft?.version ?? null);
      }),
    );

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, permissions: string[]): Promise<PromptResponseDto> {
    const prompt = await this.promptsRepository.findById(id);
    return this.toVisiblePromptDto(prompt, permissions);
  }

  async findByCode(code: string, permissions: string[]): Promise<PromptResponseDto> {
    const prompt = await this.promptsRepository.findByCode(code.trim().toLowerCase());
    return this.toVisiblePromptDto(prompt, permissions);
  }

  async update(id: string, dto: UpdatePromptDto, actorId?: string): Promise<PromptResponseDto> {
    const prompt = await this.requireMutablePrompt(id);

    if (dto.name !== undefined) {
      prompt.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      prompt.description = dto.description.trim() || null;
    }
    if (dto.category !== undefined) {
      prompt.category = dto.category;
    }
    if (dto.tags !== undefined) {
      prompt.tags = dto.tags;
    }

    let draft: PromptVersionEntity | null = null;
    const hasContentFields = this.hasContentFields(dto);
    if (hasContentFields) {
      assertJsonPayloadSize(dto.template, 'template', { skipNull: true });
      assertJsonPayloadSize(dto.messages, 'messages', { skipNull: true });
      assertJsonPayloadSize(dto.variablesSchema, 'variablesSchema', { skipNull: true });
      assertJsonPayloadSize(dto.modelHints, 'modelHints', { skipNull: true });

      draft = await this.promptVersionsRepository.findDraftByPromptId(prompt.id);
      if (!draft) {
        throw new AppException(
          'No draft version to update; create a new version first',
          HttpStatus.CONFLICT,
          { code: ERROR_CODES.PROMPT_VERSION_IMMUTABLE },
        );
      }
      this.applyContentToVersion(draft, dto);
      await this.promptVersionsRepository.save(draft);
    }

    await this.promptsRepository.save(prompt);
    if (!draft) {
      draft = await this.promptVersionsRepository.findDraftByPromptId(prompt.id);
    }
    const result = this.toPromptDto(prompt, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: AuditAction.UPDATED,
      resourceType: 'prompt',
      resourceId: prompt.id,
      resourceCode: prompt.code,
      actorUserId: actorId ?? null,
      metadata: { draftVersion: draft?.version ?? null },
    });

    return result;
  }

  async publish(id: string, actorId?: string): Promise<PromptResponseDto> {
    const prompt = await this.requireMutablePrompt(id);

    const result = await this.promptsRepository.withTransaction(async (manager) => {
      const promptRepo = manager.getRepository(PromptEntity);
      const versionRepo = manager.getRepository(PromptVersionEntity);

      const lockedPrompt = await promptRepo.findOne({ where: { id: prompt.id } });
      if (!lockedPrompt || lockedPrompt.status === PromptStatus.ARCHIVED) {
        throw new AppException('Prompt not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.PROMPT_NOT_FOUND,
        });
      }

      const draft = await versionRepo.findOne({
        where: { promptId: lockedPrompt.id, status: PromptVersionStatus.DRAFT },
      });
      if (!draft) {
        throw new AppException('No draft version to publish', HttpStatus.CONFLICT, {
          code: ERROR_CODES.PROMPT_NO_DRAFT_TO_PUBLISH,
        });
      }

      this.assertUsableContent(draft);

      draft.status = PromptVersionStatus.PUBLISHED;
      draft.publishedAt = new Date();
      await versionRepo.save(draft);

      lockedPrompt.status = PromptStatus.PUBLISHED;
      lockedPrompt.currentVersion = draft.version;
      await promptRepo.save(lockedPrompt);

      return this.toPromptDto(lockedPrompt, null);
    });

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: AuditAction.PUBLISHED,
      resourceType: 'prompt',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId ?? null,
      metadata: { version: result.currentVersion },
    });

    return result;
  }

  async createVersion(
    id: string,
    dto: CreatePromptVersionDto,
    actorId: string,
  ): Promise<PromptVersionResponseDto> {
    const prompt = await this.requireMutablePrompt(id);
    if (prompt.status !== PromptStatus.PUBLISHED || prompt.currentVersion == null) {
      throw new AppException(
        'Only published prompts can create a new draft version',
        HttpStatus.CONFLICT,
        { code: ERROR_CODES.PROMPT_INVALID_STATE },
      );
    }

    const existingDraft = await this.promptVersionsRepository.findDraftByPromptId(prompt.id);
    if (existingDraft) {
      throw new AppException('A draft version already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.PROMPT_DRAFT_VERSION_EXISTS,
      });
    }

    const current = await this.promptVersionsRepository.findByPromptAndVersion(
      prompt.id,
      prompt.currentVersion,
    );
    if (!current || current.status !== PromptVersionStatus.PUBLISHED) {
      throw new AppException('Current published version not found', HttpStatus.CONFLICT, {
        code: ERROR_CODES.PROMPT_INVALID_STATE,
      });
    }

    const nextVersion = (await this.promptVersionsRepository.getMaxVersion(prompt.id)) + 1;
    const draft = await this.promptVersionsRepository.createAndSave({
      promptId: prompt.id,
      version: nextVersion,
      status: PromptVersionStatus.DRAFT,
      template: current.template,
      messages: current.messages ? [...current.messages] : null,
      variablesSchema: { ...current.variablesSchema },
      modelHints: { ...current.modelHints },
      changelog: dto.changelog ?? null,
      publishedAt: null,
      createdBy: actorId,
    });

    const result = this.toVersionDto(draft);

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: AuditAction.CREATED,
      resourceType: 'prompt_version',
      resourceId: prompt.id,
      resourceCode: prompt.code,
      actorUserId: actorId,
      metadata: { version: draft.version },
    });

    return result;
  }

  async listVersions(
    id: string,
    permissions: string[],
  ): Promise<{ data: PromptVersionResponseDto[] }> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const versions = await this.promptVersionsRepository.findAllByPromptId(id, includeDrafts);
    return { data: versions.map((v) => this.toVersionDto(v)) };
  }

  async getVersion(
    id: string,
    version: number,
    permissions: string[],
  ): Promise<PromptVersionResponseDto> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const row = await this.promptVersionsRepository.findByPromptAndVersion(id, version);
    if (!row || (!includeDrafts && row.status !== PromptVersionStatus.PUBLISHED)) {
      throw new AppException('Prompt version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.PROMPT_NOT_FOUND,
      });
    }
    return this.toVersionDto(row);
  }

  async enable(id: string, actorId?: string): Promise<PromptResponseDto> {
    return this.setEnabled(id, true, actorId);
  }

  async disable(id: string, actorId?: string): Promise<PromptResponseDto> {
    return this.setEnabled(id, false, actorId);
  }

  async softDelete(id: string, actorId?: string): Promise<{ message: string }> {
    const prompt = await this.requireMutablePrompt(id);
    prompt.status = PromptStatus.ARCHIVED;
    await this.promptsRepository.save(prompt);
    await this.promptsRepository.softDelete(id);

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: AuditAction.ARCHIVED,
      resourceType: 'prompt',
      resourceId: prompt.id,
      resourceCode: prompt.code,
      actorUserId: actorId ?? null,
    });

    return { message: 'Prompt archived' };
  }

  /**
   * Prompt must be published, enabled, and not soft-deleted to be assignable (e.g. as promptRef).
   */
  async assertAssignableByCode(code: string): Promise<PromptEntity> {
    const { normalized, prompt } = await this.loadPromptByCode(code);
    if (!prompt) {
      throw new AppException('Prompt is not assignable (not found)', HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE,
        details: { promptCode: normalized },
      });
    }
    if (!this.isPublishedAndEnabled(prompt)) {
      throw new AppException(
        'Prompt is not assignable (must be published and enabled)',
        HttpStatus.BAD_REQUEST,
        {
          code: ERROR_CODES.PROMPT_NOT_ASSIGNABLE,
          details: { promptCode: normalized },
        },
      );
    }
    return prompt;
  }

  /**
   * Worker-safe resolve: published + enabled Prompt with its current published version.
   * Throws plain Error (not AppException) for Execution orchestrator step failure paths.
   */
  async resolvePublishedByCode(
    code: string,
  ): Promise<{ prompt: PromptEntity; version: PromptVersionEntity }> {
    const { normalized, prompt } = await this.loadPromptByCode(code);
    if (!prompt || prompt.deletedAt != null) {
      throw new Error(`Prompt not found: ${normalized}`);
    }
    if (prompt.status !== PromptStatus.PUBLISHED || !prompt.enabled) {
      throw new Error(
        `Prompt ${normalized} is not published and enabled (status=${prompt.status}, enabled=${prompt.enabled})`,
      );
    }
    if (prompt.currentVersion == null) {
      throw new Error(`Prompt ${normalized} has no currentVersion`);
    }
    const version = await this.promptVersionsRepository.findByPromptAndVersion(
      prompt.id,
      prompt.currentVersion,
    );
    if (!version || version.status !== PromptVersionStatus.PUBLISHED) {
      throw new Error(`Prompt ${normalized} version ${prompt.currentVersion} is not published`);
    }
    return { prompt, version };
  }

  canSeeDrafts(permissions: string[]): boolean {
    return canSeeCatalogDrafts(permissions, PERMISSIONS.PROMPTS.UPDATE);
  }

  private async setEnabled(
    id: string,
    enabled: boolean,
    actorId?: string,
  ): Promise<PromptResponseDto> {
    const prompt = await this.requireMutablePrompt(id);
    prompt.enabled = enabled;
    await this.promptsRepository.save(prompt);
    const draft = await this.promptVersionsRepository.findDraftByPromptId(prompt.id);
    const result = this.toPromptDto(prompt, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.PROMPT,
      action: enabled ? AuditAction.ENABLED : AuditAction.DISABLED,
      resourceType: 'prompt',
      resourceId: prompt.id,
      resourceCode: prompt.code,
      actorUserId: actorId ?? null,
    });

    return result;
  }

  private async toVisiblePromptDto(
    prompt: PromptEntity | null,
    permissions: string[],
  ): Promise<PromptResponseDto> {
    const includeDrafts = this.canSeeDrafts(permissions);
    if (!prompt || (!includeDrafts && prompt.status !== PromptStatus.PUBLISHED)) {
      throw new AppException('Prompt not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.PROMPT_NOT_FOUND,
      });
    }

    const draft = includeDrafts
      ? await this.promptVersionsRepository.findDraftByPromptId(prompt.id)
      : null;
    return this.toPromptDto(prompt, draft?.version ?? null);
  }

  private async loadPromptByCode(
    code: string,
  ): Promise<{ normalized: string; prompt: PromptEntity | null }> {
    const normalized = code.trim().toLowerCase();
    const prompt = await this.promptsRepository.findByCode(normalized);
    return { normalized, prompt };
  }

  private isPublishedAndEnabled(prompt: PromptEntity): boolean {
    return (
      prompt.deletedAt == null && prompt.status === PromptStatus.PUBLISHED && prompt.enabled
    );
  }

  private async requireMutablePrompt(id: string): Promise<PromptEntity> {
    const prompt = await this.promptsRepository.findById(id);
    if (!prompt || prompt.status === PromptStatus.ARCHIVED) {
      throw new AppException('Prompt not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.PROMPT_NOT_FOUND,
      });
    }
    return prompt;
  }

  private hasContentFields(dto: UpdatePromptDto): boolean {
    return (
      dto.template !== undefined ||
      dto.messages !== undefined ||
      dto.variablesSchema !== undefined ||
      dto.modelHints !== undefined ||
      dto.changelog !== undefined
    );
  }

  private applyContentToVersion(version: PromptVersionEntity, dto: UpdatePromptDto): void {
    if (version.status !== PromptVersionStatus.DRAFT) {
      throw new AppException('Published version content is immutable', HttpStatus.CONFLICT, {
        code: ERROR_CODES.PROMPT_VERSION_IMMUTABLE,
      });
    }
    if (dto.template !== undefined) {
      version.template = dto.template ?? null;
    }
    if (dto.messages !== undefined) {
      version.messages = dto.messages ?? null;
    }
    if (dto.variablesSchema !== undefined) {
      version.variablesSchema = dto.variablesSchema;
    }
    if (dto.modelHints !== undefined) {
      version.modelHints = dto.modelHints;
    }
    if (dto.changelog !== undefined) {
      version.changelog = dto.changelog;
    }
  }

  private assertUsableContent(version: PromptVersionEntity): void {
    const hasTemplate = typeof version.template === 'string' && version.template.trim().length > 0;
    const hasMessages =
      Array.isArray(version.messages) &&
      version.messages.some((m) => typeof m.content === 'string' && m.content.trim().length > 0);

    if (!hasTemplate && !hasMessages) {
      throw new AppException(
        'Prompt must have non-empty template or messages to publish',
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.PROMPT_EMPTY_CONTENT },
      );
    }
  }

  private toPromptDto(prompt: PromptEntity, draftVersion: number | null): PromptResponseDto {
    return plainToInstance(
      PromptResponseDto,
      { ...prompt, draftVersion },
      { excludeExtraneousValues: true },
    );
  }

  private toVersionDto(version: PromptVersionEntity): PromptVersionResponseDto {
    return plainToInstance(PromptVersionResponseDto, version, {
      excludeExtraneousValues: true,
    });
  }
}
