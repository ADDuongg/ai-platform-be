import { HttpStatus, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ERROR_CODES, PERMISSIONS } from '@common/constants';
import { AppException } from '@common/exceptions';
import { assertJsonPayloadSize, canSeeCatalogDrafts } from '@common/utils';

import { AuditAction, AuditDomain } from '@modules/audit/constants/audit.constants';
import { AuditLogService } from '@modules/audit/services/audit-log.service';

import { CreateToolDto } from '../dto/create-tool.dto';
import { CreateToolVersionDto } from '../dto/create-tool-version.dto';
import { ListToolsQueryDto } from '../dto/list-tools-query.dto';
import { ToolResponseDto } from '../dto/tool-response.dto';
import { ToolVersionResponseDto } from '../dto/tool-version-response.dto';
import { UpdateToolDto } from '../dto/update-tool.dto';
import { ToolEntity } from '../entities/tool.entity';
import { ToolVersionEntity } from '../entities/tool-version.entity';
import { ToolStatus, ToolVersionStatus } from '../enums';
import { ToolsRepository } from '../repositories/tools.repository';
import { ToolVersionsRepository } from '../repositories/tool-versions.repository';

export const TOOL_REFS_MAX = 20;

const SECRET_KEY_PATTERN =
  /^(apikey|api_key|password|token|secret|accesskey|access_key|privatekey|private_key)$/i;

@Injectable()
export class ToolsService {
  constructor(
    private readonly toolsRepository: ToolsRepository,
    private readonly toolVersionsRepository: ToolVersionsRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateToolDto, actorId: string): Promise<ToolResponseDto> {
    const code = dto.code.trim().toLowerCase();
    this.assertConfigSafe(dto.config);
    assertJsonPayloadSize(dto.config, 'config', { skipNull: true });
    assertJsonPayloadSize(dto.inputSchema, 'inputSchema', { skipNull: true });
    assertJsonPayloadSize(dto.outputSchema, 'outputSchema', { skipNull: true });

    const existing = await this.toolsRepository.findByCode(code);
    if (existing) {
      throw new AppException('Tool code already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.TOOL_CODE_EXISTS,
      });
    }

    const result = await this.toolsRepository.withTransaction(async (manager) => {
      const toolRepo = manager.getRepository(ToolEntity);
      const versionRepo = manager.getRepository(ToolVersionEntity);

      const savedTool = await toolRepo.save(
        toolRepo.create({
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          toolType: dto.toolType,
          status: ToolStatus.DRAFT,
          enabled: true,
          currentVersion: null,
          createdBy: actorId,
        }),
      );

      await versionRepo.save(
        versionRepo.create({
          toolId: savedTool.id,
          version: 1,
          status: ToolVersionStatus.DRAFT,
          configJson: dto.config ?? {},
          inputSchema: dto.inputSchema ?? {},
          outputSchema: dto.outputSchema ?? {},
          secretRef: dto.secretRef ?? null,
          timeoutMs: dto.timeoutMs ?? null,
          maxRetries: dto.maxRetries ?? null,
          changelog: dto.changelog ?? null,
          publishedAt: null,
          createdBy: actorId,
        }),
      );

      return this.toToolDto(savedTool, 1);
    });

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: AuditAction.CREATED,
      resourceType: 'tool',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId,
      metadata: { toolType: result.toolType },
    });

    return result;
  }

  async list(
    query: ListToolsQueryDto,
    permissions: string[],
  ): Promise<{ data: ToolResponseDto[]; meta: Record<string, number> }> {
    const includeDrafts = this.canSeeDrafts(permissions);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const [tools, total] = await this.toolsRepository.findManyFiltered({
      status: includeDrafts ? query.status : undefined,
      toolType: query.toolType,
      enabled: query.enabled,
      includeDrafts,
      page,
      limit,
    });

    const data = await Promise.all(
      tools.map(async (tool) => {
        const draft = includeDrafts
          ? await this.toolVersionsRepository.findDraftByToolId(tool.id)
          : null;
        return this.toToolDto(tool, draft?.version ?? null);
      }),
    );

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, permissions: string[]): Promise<ToolResponseDto> {
    const tool = await this.toolsRepository.findById(id);
    return this.toVisibleToolDto(tool, permissions);
  }

  async findByCode(code: string, permissions: string[]): Promise<ToolResponseDto> {
    const tool = await this.toolsRepository.findByCode(code.trim().toLowerCase());
    return this.toVisibleToolDto(tool, permissions);
  }

  async update(id: string, dto: UpdateToolDto, actorId?: string): Promise<ToolResponseDto> {
    const tool = await this.requireMutableTool(id);

    if (dto.name !== undefined) {
      tool.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      tool.description = dto.description.trim() || null;
    }

    let draft: ToolVersionEntity | null = null;
    const hasConfigFields = this.hasConfigFields(dto);
    if (hasConfigFields) {
      if (dto.config !== undefined) {
        this.assertConfigSafe(dto.config);
        assertJsonPayloadSize(dto.config, 'config', { skipNull: true });
      }
      assertJsonPayloadSize(dto.inputSchema, 'inputSchema', { skipNull: true });
      assertJsonPayloadSize(dto.outputSchema, 'outputSchema', { skipNull: true });

      draft = await this.toolVersionsRepository.findDraftByToolId(tool.id);
      if (!draft) {
        throw new AppException(
          'No draft version to update; create a new version first',
          HttpStatus.CONFLICT,
          { code: ERROR_CODES.TOOL_VERSION_IMMUTABLE },
        );
      }
      this.applyConfigToVersion(draft, dto);
      await this.toolVersionsRepository.save(draft);
    }

    await this.toolsRepository.save(tool);
    if (!draft) {
      draft = await this.toolVersionsRepository.findDraftByToolId(tool.id);
    }
    const result = this.toToolDto(tool, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: AuditAction.UPDATED,
      resourceType: 'tool',
      resourceId: tool.id,
      resourceCode: tool.code,
      actorUserId: actorId ?? null,
      metadata: { draftVersion: draft?.version ?? null },
    });

    return result;
  }

  async publish(id: string, actorId?: string): Promise<ToolResponseDto> {
    const tool = await this.requireMutableTool(id);

    const result = await this.toolsRepository.withTransaction(async (manager) => {
      const toolRepo = manager.getRepository(ToolEntity);
      const versionRepo = manager.getRepository(ToolVersionEntity);

      const lockedTool = await toolRepo.findOne({ where: { id: tool.id } });
      if (!lockedTool || lockedTool.status === ToolStatus.ARCHIVED) {
        throw new AppException('Tool not found', HttpStatus.NOT_FOUND, {
          code: ERROR_CODES.TOOL_NOT_FOUND,
        });
      }

      const draft = await versionRepo.findOne({
        where: { toolId: lockedTool.id, status: ToolVersionStatus.DRAFT },
      });
      if (!draft) {
        throw new AppException('No draft version to publish', HttpStatus.CONFLICT, {
          code: ERROR_CODES.TOOL_NO_DRAFT_TO_PUBLISH,
        });
      }

      this.assertConfigSafe(draft.configJson);

      draft.status = ToolVersionStatus.PUBLISHED;
      draft.publishedAt = new Date();
      await versionRepo.save(draft);

      lockedTool.status = ToolStatus.PUBLISHED;
      lockedTool.currentVersion = draft.version;
      await toolRepo.save(lockedTool);

      return this.toToolDto(lockedTool, null);
    });

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: AuditAction.PUBLISHED,
      resourceType: 'tool',
      resourceId: result.id,
      resourceCode: result.code,
      actorUserId: actorId ?? null,
      metadata: { version: result.currentVersion },
    });

    return result;
  }

  async createVersion(
    id: string,
    dto: CreateToolVersionDto,
    actorId: string,
  ): Promise<ToolVersionResponseDto> {
    const tool = await this.requireMutableTool(id);
    if (tool.status !== ToolStatus.PUBLISHED || tool.currentVersion == null) {
      throw new AppException(
        'Only published tools can create a new draft version',
        HttpStatus.CONFLICT,
        { code: ERROR_CODES.TOOL_INVALID_STATE },
      );
    }

    const existingDraft = await this.toolVersionsRepository.findDraftByToolId(tool.id);
    if (existingDraft) {
      throw new AppException('A draft version already exists', HttpStatus.CONFLICT, {
        code: ERROR_CODES.TOOL_DRAFT_VERSION_EXISTS,
      });
    }

    const current = await this.toolVersionsRepository.findByToolAndVersion(
      tool.id,
      tool.currentVersion,
    );
    if (!current || current.status !== ToolVersionStatus.PUBLISHED) {
      throw new AppException('Current published version not found', HttpStatus.CONFLICT, {
        code: ERROR_CODES.TOOL_INVALID_STATE,
      });
    }

    const nextVersion = (await this.toolVersionsRepository.getMaxVersion(tool.id)) + 1;
    const draft = await this.toolVersionsRepository.createAndSave({
      toolId: tool.id,
      version: nextVersion,
      status: ToolVersionStatus.DRAFT,
      configJson: { ...current.configJson },
      inputSchema: { ...current.inputSchema },
      outputSchema: { ...current.outputSchema },
      secretRef: current.secretRef,
      timeoutMs: current.timeoutMs,
      maxRetries: current.maxRetries,
      changelog: dto.changelog ?? null,
      publishedAt: null,
      createdBy: actorId,
    });

    const result = this.toVersionDto(draft);

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: AuditAction.CREATED,
      resourceType: 'tool_version',
      resourceId: tool.id,
      resourceCode: tool.code,
      actorUserId: actorId,
      metadata: { version: draft.version },
    });

    return result;
  }

  async listVersions(
    id: string,
    permissions: string[],
  ): Promise<{ data: ToolVersionResponseDto[] }> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const versions = await this.toolVersionsRepository.findAllByToolId(id, includeDrafts);
    return { data: versions.map((v) => this.toVersionDto(v)) };
  }

  async getVersion(
    id: string,
    version: number,
    permissions: string[],
  ): Promise<ToolVersionResponseDto> {
    await this.findById(id, permissions);
    const includeDrafts = this.canSeeDrafts(permissions);
    const row = await this.toolVersionsRepository.findByToolAndVersion(id, version);
    if (!row || (!includeDrafts && row.status !== ToolVersionStatus.PUBLISHED)) {
      throw new AppException('Tool version not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
      });
    }
    return this.toVersionDto(row);
  }

  async enable(id: string, actorId?: string): Promise<ToolResponseDto> {
    return this.setEnabled(id, true, actorId);
  }

  async disable(id: string, actorId?: string): Promise<ToolResponseDto> {
    return this.setEnabled(id, false, actorId);
  }

  async softDelete(id: string, actorId?: string): Promise<{ message: string }> {
    const tool = await this.requireMutableTool(id);
    tool.status = ToolStatus.ARCHIVED;
    await this.toolsRepository.save(tool);
    await this.toolsRepository.softDelete(id);

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: AuditAction.ARCHIVED,
      resourceType: 'tool',
      resourceId: tool.id,
      resourceCode: tool.code,
      actorUserId: actorId ?? null,
    });

    return { message: 'Tool archived' };
  }

  /**
   * Each Tool code must be published, enabled, and not soft-deleted.
   */
  async assertAssignableByCodes(codes: string[]): Promise<void> {
    if (codes.length > TOOL_REFS_MAX) {
      throw new AppException(
        `toolRefs may contain at most ${TOOL_REFS_MAX} codes`,
        HttpStatus.BAD_REQUEST,
        {
          code: ERROR_CODES.TOOL_REFS_INVALID,
          details: { max: TOOL_REFS_MAX, count: codes.length },
        },
      );
    }

    const normalized = codes.map((code) => code.trim().toLowerCase());
    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      throw new AppException('toolRefs must not contain duplicate codes', HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.TOOL_REFS_INVALID,
      });
    }

    for (const code of unique) {
      await this.assertAssignableByCode(code);
    }
  }

  /**
   * Worker-safe resolve: published + enabled Tool with its current published version.
   * Throws plain Error (not AppException) for Execution orchestrator step failure paths.
   */
  async resolvePublishedByCode(
    code: string,
  ): Promise<{ tool: ToolEntity; version: ToolVersionEntity }> {
    const normalized = code.trim().toLowerCase();
    const tool = await this.toolsRepository.findByCode(normalized);
    if (!tool || tool.deletedAt != null) {
      throw new Error(`Tool not found: ${normalized}`);
    }
    if (tool.status !== ToolStatus.PUBLISHED || !tool.enabled) {
      throw new Error(
        `Tool ${normalized} is not published and enabled (status=${tool.status}, enabled=${tool.enabled})`,
      );
    }
    if (tool.currentVersion == null) {
      throw new Error(`Tool ${normalized} has no currentVersion`);
    }
    const version = await this.toolVersionsRepository.findByToolAndVersion(
      tool.id,
      tool.currentVersion,
    );
    if (!version || version.status !== ToolVersionStatus.PUBLISHED) {
      throw new Error(`Tool ${normalized} version ${tool.currentVersion} is not published`);
    }
    return { tool, version };
  }

  canSeeDrafts(permissions: string[]): boolean {
    return canSeeCatalogDrafts(permissions, PERMISSIONS.TOOLS.UPDATE);
  }

  private async setEnabled(
    id: string,
    enabled: boolean,
    actorId?: string,
  ): Promise<ToolResponseDto> {
    const tool = await this.requireMutableTool(id);
    tool.enabled = enabled;
    await this.toolsRepository.save(tool);
    const draft = await this.toolVersionsRepository.findDraftByToolId(tool.id);
    const result = this.toToolDto(tool, draft?.version ?? null);

    await this.auditLogService.record({
      domain: AuditDomain.TOOL,
      action: enabled ? AuditAction.ENABLED : AuditAction.DISABLED,
      resourceType: 'tool',
      resourceId: tool.id,
      resourceCode: tool.code,
      actorUserId: actorId ?? null,
    });

    return result;
  }

  private async toVisibleToolDto(
    tool: ToolEntity | null,
    permissions: string[],
  ): Promise<ToolResponseDto> {
    const includeDrafts = this.canSeeDrafts(permissions);
    if (!tool || (!includeDrafts && tool.status !== ToolStatus.PUBLISHED)) {
      throw new AppException('Tool not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
      });
    }

    const draft = includeDrafts
      ? await this.toolVersionsRepository.findDraftByToolId(tool.id)
      : null;
    return this.toToolDto(tool, draft?.version ?? null);
  }

  private async assertAssignableByCode(code: string): Promise<void> {
    const tool = await this.toolsRepository.findByCode(code);
    if (!tool) {
      throw new AppException('Tool is not assignable (not found)', HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.TOOL_NOT_ASSIGNABLE,
        details: { toolCode: code },
      });
    }
    if (tool.deletedAt != null || tool.status !== ToolStatus.PUBLISHED || !tool.enabled) {
      throw new AppException(
        'Tool is not assignable (must be published and enabled)',
        HttpStatus.BAD_REQUEST,
        {
          code: ERROR_CODES.TOOL_NOT_ASSIGNABLE,
          details: { toolCode: code },
        },
      );
    }
  }

  private async requireMutableTool(id: string): Promise<ToolEntity> {
    const tool = await this.toolsRepository.findById(id);
    if (!tool || tool.status === ToolStatus.ARCHIVED) {
      throw new AppException('Tool not found', HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.TOOL_NOT_FOUND,
      });
    }
    return tool;
  }

  private hasConfigFields(dto: UpdateToolDto): boolean {
    return (
      dto.config !== undefined ||
      dto.inputSchema !== undefined ||
      dto.outputSchema !== undefined ||
      dto.secretRef !== undefined ||
      dto.timeoutMs !== undefined ||
      dto.maxRetries !== undefined ||
      dto.changelog !== undefined
    );
  }

  private applyConfigToVersion(version: ToolVersionEntity, dto: UpdateToolDto): void {
    if (version.status !== ToolVersionStatus.DRAFT) {
      throw new AppException('Published version config is immutable', HttpStatus.CONFLICT, {
        code: ERROR_CODES.TOOL_VERSION_IMMUTABLE,
      });
    }
    if (dto.config !== undefined) {
      version.configJson = dto.config;
    }
    if (dto.inputSchema !== undefined) {
      version.inputSchema = dto.inputSchema;
    }
    if (dto.outputSchema !== undefined) {
      version.outputSchema = dto.outputSchema;
    }
    if (dto.secretRef !== undefined) {
      version.secretRef = dto.secretRef;
    }
    if (dto.timeoutMs !== undefined) {
      version.timeoutMs = dto.timeoutMs;
    }
    if (dto.maxRetries !== undefined) {
      version.maxRetries = dto.maxRetries;
    }
    if (dto.changelog !== undefined) {
      version.changelog = dto.changelog;
    }
  }

  private assertConfigSafe(config: Record<string, unknown> | undefined): void {
    if (config == null) return;
    this.scanForSecretKeys(config, 0);
  }

  private scanForSecretKeys(value: unknown, depth: number): void {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const MAX_DEPTH = 1;
    if (depth > MAX_DEPTH) {
      return;
    }

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key) && typeof nested === 'string' && nested.length > 0) {
        throw new AppException(
          'Tool config must not contain plaintext secret-shaped keys',
          HttpStatus.BAD_REQUEST,
          {
            code: ERROR_CODES.TOOL_SECRET_IN_CONFIG,
            details: { key },
          },
        );
      }
      if (
        depth < MAX_DEPTH &&
        nested != null &&
        typeof nested === 'object' &&
        !Array.isArray(nested)
      ) {
        this.scanForSecretKeys(nested, depth + 1);
      }
    }
  }

  private toToolDto(tool: ToolEntity, draftVersion: number | null): ToolResponseDto {
    return plainToInstance(
      ToolResponseDto,
      { ...tool, draftVersion },
      { excludeExtraneousValues: true },
    );
  }

  private toVersionDto(version: ToolVersionEntity): ToolVersionResponseDto {
    return plainToInstance(
      ToolVersionResponseDto,
      {
        ...version,
        config: version.configJson,
      },
      { excludeExtraneousValues: true },
    );
  }
}
