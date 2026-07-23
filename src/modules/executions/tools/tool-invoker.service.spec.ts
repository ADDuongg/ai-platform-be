import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { ToolStatus, ToolType, ToolVersionStatus } from '@modules/tools/enums';

import { ImageGenerationAdapter } from './adapters/image-generation.adapter';
import type { ToolAdapter } from './tool-adapter';
import { ToolAdapterRegistry } from './tool-registry';
import { ToolInvokerService } from './tool-invoker.service';

describe('ToolInvokerService', () => {
  const toolsService = {
    resolvePublishedByCode: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'toolRuntime') {
        return {
          mode: 'live',
          storageRoot: '.data/tool-storage',
          resultMaxBytes: 262_144,
          flux: {
            apiKey: '',
            baseUrl: 'https://api.bfl.ai',
            endpointPath: '/v1/flux-2-pro',
            pollIntervalMs: 500,
          },
        };
      }
      return undefined;
    }),
  } as unknown as ConfigService<AllConfigType>;

  const okAdapter: ToolAdapter = {
    code: 'web-search',
    invoke: jest.fn().mockResolvedValue({ provider: 'duckduckgo', results: [] }),
  };

  let invoker: ToolInvokerService;

  beforeEach(() => {
    jest.clearAllMocks();
    const registry = new ToolAdapterRegistry([
      okAdapter,
      new ImageGenerationAdapter(configService),
    ]);
    invoker = new ToolInvokerService(toolsService as never, configService, registry);
  });

  it('invokes adapters in toolRefs order', async () => {
    toolsService.resolvePublishedByCode.mockResolvedValue({
      tool: {
        code: 'web-search',
        toolType: ToolType.SEARCH,
        status: ToolStatus.PUBLISHED,
        enabled: true,
      },
      version: {
        configJson: { provider: 'duckduckgo' },
        timeoutMs: 5_000,
        maxRetries: 0,
        status: ToolVersionStatus.PUBLISHED,
      },
    });

    const bundle = await invoker.invokeAll(['web-search'], { query: 'kids' });
    expect(bundle.tools).toHaveLength(1);
    expect(bundle.tools[0].code).toBe('web-search');
    expect(okAdapter.invoke).toHaveBeenCalled();
  });

  it('throws when tool resolve fails (missing/disabled)', async () => {
    toolsService.resolvePublishedByCode.mockRejectedValue(
      new Error('Tool not found: missing-tool'),
    );
    await expect(invoker.invokeAll(['missing-tool'], {})).rejects.toThrow(/Tool not found/);
  });

  it('throws unsupported when no adapter registered', async () => {
    toolsService.resolvePublishedByCode.mockResolvedValue({
      tool: {
        code: 'unknown-tool',
        toolType: ToolType.SEARCH,
        status: ToolStatus.PUBLISHED,
        enabled: true,
      },
      version: {
        configJson: {},
        timeoutMs: 5_000,
        maxRetries: 0,
        status: ToolVersionStatus.PUBLISHED,
      },
    });

    await expect(invoker.invokeAll(['unknown-tool'], {})).rejects.toThrow(
      /Unsupported tool adapter/,
    );
  });

  it('retries then fails on adapter errors', async () => {
    const flaky: ToolAdapter = {
      code: 'web-search',
      invoke: jest
        .fn()
        .mockRejectedValueOnce(new Error('transient'))
        .mockRejectedValueOnce(new Error('still bad')),
    };
    const registry = new ToolAdapterRegistry([flaky]);
    invoker = new ToolInvokerService(toolsService as never, configService, registry);

    toolsService.resolvePublishedByCode.mockResolvedValue({
      tool: { code: 'web-search', toolType: ToolType.SEARCH },
      version: { configJson: {}, timeoutMs: 1_000, maxRetries: 1 },
    });

    await expect(invoker.invokeAll(['web-search'], { query: 'x' })).rejects.toThrow(
      /still bad|transient/,
    );
    expect(flaky.invoke).toHaveBeenCalledTimes(2);
  });

  it('chains first URL from prior web-search into web-browser input', async () => {
    const searchAdapter: ToolAdapter = {
      code: 'web-search',
      invoke: jest.fn().mockResolvedValue({
        provider: 'duckduckgo',
        results: [{ title: 'Kids SS27', url: 'https://example.com/kids-ss27', snippet: '…' }],
      }),
    };
    const browserAdapter: ToolAdapter = {
      code: 'web-browser',
      invoke: jest.fn().mockResolvedValue({
        provider: 'native-fetch',
        url: 'https://example.com/kids-ss27',
        text: 'page',
      }),
    };
    const registry = new ToolAdapterRegistry([searchAdapter, browserAdapter]);
    invoker = new ToolInvokerService(toolsService as never, configService, registry);

    toolsService.resolvePublishedByCode.mockImplementation(async (code: string) => ({
      tool: { code, toolType: code === 'web-search' ? ToolType.SEARCH : ToolType.BROWSER },
      version: { configJson: {}, timeoutMs: 5_000, maxRetries: 0 },
    }));

    const bundle = await invoker.invokeAll(
      ['web-search', 'web-browser'],
      { market: 'VN', season: 'SS27' },
      { agentCode: 'fashion-image-search' },
    );

    expect(bundle.tools).toHaveLength(2);
    expect(browserAdapter.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          market: 'VN',
          season: 'SS27',
          url: 'https://example.com/kids-ss27',
        }),
      }),
    );
  });

  it('soft-skips web-browser when no URL is available', async () => {
    const searchAdapter: ToolAdapter = {
      code: 'web-search',
      invoke: jest.fn().mockResolvedValue({ provider: 'duckduckgo', results: [] }),
    };
    const browserAdapter: ToolAdapter = {
      code: 'web-browser',
      invoke: jest.fn(),
    };
    const registry = new ToolAdapterRegistry([searchAdapter, browserAdapter]);
    invoker = new ToolInvokerService(toolsService as never, configService, registry);

    toolsService.resolvePublishedByCode.mockImplementation(async (code: string) => ({
      tool: { code, toolType: code === 'web-search' ? ToolType.SEARCH : ToolType.BROWSER },
      version: { configJson: {}, timeoutMs: 5_000, maxRetries: 0 },
    }));

    const bundle = await invoker.invokeAll(['web-search', 'web-browser'], { market: 'VN' });

    expect(browserAdapter.invoke).not.toHaveBeenCalled();
    expect(bundle.tools[1]).toEqual({
      code: 'web-browser',
      result: {
        provider: 'native-fetch',
        skipped: true,
        reason: 'no url available from input or prior tool results',
      },
    });
  });
});
