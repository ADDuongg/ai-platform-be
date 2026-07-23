import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions';

import {
  LLM_CATALOG,
  findCatalogProvider,
  type LlmCatalogProviderId,
} from '../constants/llm-catalog.constant';
import { LlmModelDto, LlmProviderDto } from '../dto/llm-catalog-response.dto';

@Injectable()
export class LlmCatalogService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  listProviders(): LlmProviderDto[] {
    // Static allowlist for MVP. To switch to dynamic listing later:
    // const dynamic = await this.fetchProviderModelsFromVendor(providerId);
    // return mergeAllowlistWithVendor(LLM_CATALOG, dynamic);
    return LLM_CATALOG.map((provider) => ({
      id: provider.id,
      label: provider.label,
      defaultModel: provider.defaultModel,
      configured: this.isConfigured(provider.id),
      models: provider.models.map((model) => ({ id: model.id, label: model.label })),
    }));
  }

  listModels(providerId?: string): LlmModelDto[] {
    if (!providerId?.trim()) {
      return LLM_CATALOG.flatMap((provider) =>
        provider.models.map((model) => ({ id: model.id, label: model.label })),
      );
    }

    const provider = findCatalogProvider(providerId.trim().toLowerCase());
    if (!provider) {
      throw new AppException(`Unknown LLM provider: ${providerId}`, HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.VALIDATION_ERROR,
      });
    }
    return provider.models.map((model) => ({ id: model.id, label: model.label }));
  }

  /**
   * Validate optional agent config.provider / config.model against the allowlist.
   * Empty/absent values are allowed (runner falls back to AGENT_RUNNER defaults).
   */
  assertValidProviderModel(config?: Record<string, unknown> | null): void {
    if (!config || typeof config !== 'object') {
      return;
    }

    const providerRaw = config.provider;
    const modelRaw = config.model;
    const provider =
      typeof providerRaw === 'string' && providerRaw.trim() ? providerRaw.trim().toLowerCase() : '';
    const model = typeof modelRaw === 'string' && modelRaw.trim() ? modelRaw.trim() : '';

    if (!provider && !model) {
      return;
    }

    if (!provider) {
      throw new AppException(
        'config.provider is required when config.model is set',
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.VALIDATION_ERROR },
      );
    }

    const catalogProvider = findCatalogProvider(provider);
    if (!catalogProvider) {
      throw new AppException(
        `Unsupported LLM provider "${provider}". Use one of: ${LLM_CATALOG.map((p) => p.id).join(', ')}`,
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.VALIDATION_ERROR },
      );
    }

    if (model && !catalogProvider.models.some((entry) => entry.id === model)) {
      throw new AppException(
        `Unsupported model "${model}" for provider "${provider}"`,
        HttpStatus.BAD_REQUEST,
        { code: ERROR_CODES.VALIDATION_ERROR },
      );
    }
  }

  getDefaultModel(providerId: LlmCatalogProviderId): string {
    const runner = this.configService.get('agentRunner', { infer: true });
    if (providerId === 'openai') {
      return runner?.openai?.model || findCatalogProvider('openai')!.defaultModel;
    }
    if (providerId === 'anthropic') {
      return runner?.anthropic?.model || findCatalogProvider('anthropic')!.defaultModel;
    }
    if (providerId === 'gemini') {
      return runner?.gemini?.model || findCatalogProvider('gemini')!.defaultModel;
    }
    return runner?.ollama?.model || findCatalogProvider('ollama')!.defaultModel;
  }

  private isConfigured(providerId: LlmCatalogProviderId): boolean {
    const runner = this.configService.get('agentRunner', { infer: true });
    if (!runner) {
      return false;
    }
    if (providerId === 'ollama') {
      return Boolean(runner.ollama?.baseUrl?.trim());
    }
    if (providerId === 'openai') {
      return Boolean(runner.openai?.apiKey?.trim());
    }
    if (providerId === 'anthropic') {
      return Boolean(runner.anthropic?.apiKey?.trim());
    }
    if (providerId === 'gemini') {
      return Boolean(runner.gemini?.apiKey?.trim());
    }
    return false;
  }

  /*
   * Example dynamic fetch (not used yet):
   *
   * private async fetchOpenAiModels(): Promise<LlmModelDto[]> {
   *   const runner = this.configService.get('agentRunner', { infer: true });
   *   const baseUrl = (runner?.openai?.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
   *   const response = await fetch(`${baseUrl}/models`, {
   *     headers: { Authorization: `Bearer ${runner?.openai?.apiKey ?? ''}` },
   *   });
   *   const payload = (await response.json()) as { data?: Array<{ id: string }> };
   *   return (payload.data ?? []).map((m) => ({ id: m.id, label: m.id }));
   * }
   */
}
