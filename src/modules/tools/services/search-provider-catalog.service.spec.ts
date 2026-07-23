import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { SearchProviderCatalogService } from './search-provider-catalog.service';

describe('SearchProviderCatalogService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  async function createService(serpapiKey = '') {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchProviderCatalogService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'toolRuntime') {
                return {
                  serpapi: { apiKey: serpapiKey, baseUrl: 'https://serpapi.com' },
                  tavily: { apiKey: '', baseUrl: 'https://api.tavily.com' },
                };
              }
              return undefined;
            },
          },
        },
      ],
    }).compile();
    return moduleRef.get(SearchProviderCatalogService);
  }

  it('lists catalog providers with DuckDuckGo always configured', async () => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_CSE_API_KEY;
    delete process.env.GOOGLE_CSE_CX;
    delete process.env.GEMINI_API_KEY;

    const service = await createService('');
    const providers = service.listProviders();
    expect(providers.map((p) => p.id)).toEqual([
      'serpapi',
      'tavily',
      'duckduckgo',
      'google-cse',
      'gemini',
    ]);
    expect(providers.find((p) => p.id === 'duckduckgo')).toMatchObject({
      configured: true,
      canBeFallback: true,
    });
    expect(providers.find((p) => p.id === 'serpapi')).toMatchObject({
      configured: false,
      engines: ['google_shopping', 'google'],
    });
  });

  it('marks serpapi configured when API key present', async () => {
    const service = await createService('sk-test');
    expect(service.listProviders().find((p) => p.id === 'serpapi')?.configured).toBe(true);
  });
});
