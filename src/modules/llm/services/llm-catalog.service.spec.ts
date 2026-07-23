import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { AppException } from '@common/exceptions';

import { LlmCatalogService } from './llm-catalog.service';

describe('LlmCatalogService', () => {
  const configService = {
    get: jest.fn(() => ({
      mode: 'stub',
      defaultModel: 'llama3.2',
      timeoutMs: 120_000,
      ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2' },
      openai: { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
      anthropic: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
      gemini: { apiKey: '', model: 'gemini-2.0-flash' },
    })),
  } as unknown as ConfigService<AllConfigType>;

  const service = new LlmCatalogService(configService);

  it('lists providers with configured flags', () => {
    const providers = service.listProviders();
    expect(providers.map((p) => p.id)).toEqual(['openai', 'anthropic', 'ollama', 'gemini']);
    expect(providers.find((p) => p.id === 'openai')?.configured).toBe(true);
    expect(providers.find((p) => p.id === 'anthropic')?.configured).toBe(false);
    expect(providers.find((p) => p.id === 'ollama')?.configured).toBe(true);
  });

  it('lists models filtered by provider', () => {
    const models = service.listModels('openai');
    expect(models.some((m) => m.id === 'gpt-4o')).toBe(true);
  });

  it('rejects unknown provider filter', () => {
    expect(() => service.listModels('claude')).toThrow(AppException);
  });

  it('allows empty config', () => {
    expect(() => service.assertValidProviderModel({})).not.toThrow();
    expect(() => service.assertValidProviderModel(undefined)).not.toThrow();
  });

  it('requires provider when model is set', () => {
    expect(() => service.assertValidProviderModel({ model: 'gpt-4o' })).toThrow(AppException);
    try {
      service.assertValidProviderModel({ model: 'gpt-4o' });
    } catch (error) {
      expect((error as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('rejects unknown provider/model pairs', () => {
    expect(() =>
      service.assertValidProviderModel({ provider: 'openai', model: 'claude-sonnet-4-20250514' }),
    ).toThrow(/Unsupported model/);
  });

  it('accepts valid provider/model', () => {
    expect(() =>
      service.assertValidProviderModel({ provider: 'openai', model: 'gpt-4o' }),
    ).not.toThrow();
  });
});
