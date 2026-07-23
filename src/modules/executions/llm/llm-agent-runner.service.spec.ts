import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';
import { AgentStatus, AgentVersionStatus } from '@modules/agents/enums';

import {
  LlmAgentRunnerService,
  renderPromptMessages,
  renderPromptTemplate,
} from '../llm/llm-agent-runner.service';
import type { LlmChatProvider } from '../llm/llm-chat.provider';
import { LlmProviderRegistry } from '../llm/llm-provider.registry';
import type { ToolInvokerService } from '../tools/tool-invoker.service';

describe('LlmAgentRunnerService', () => {
  const agent = {
    id: 'agent-1',
    code: 'fashion-trend-research',
    status: AgentStatus.PUBLISHED,
    enabled: true,
    deletedAt: null,
  };

  const agentVersion = {
    id: 'av-1',
    agentId: 'agent-1',
    version: 1,
    status: AgentVersionStatus.PUBLISHED,
    promptRef: 'fashion-trend-research-prompt',
    toolRefs: ['web-search'] as string[],
    outputSchema: {
      type: 'object',
      required: ['trendFindings'],
      properties: { trendFindings: { type: 'object' } },
    },
    configJson: {} as Record<string, unknown>,
    timeoutMs: 60_000,
    maxRetries: 0,
  };

  const promptVersion = {
    template:
      'Research {{season}}. Return JSON with trendFindings. Season={{season}} Category={{category}} Market={{market}}',
    messages: null,
    variablesSchema: {
      type: 'object',
      required: ['season', 'category', 'market'],
    },
    modelHints: { temperature: 0.2 },
  };

  const agentsRepository = { findByCode: jest.fn() };
  const agentVersionsRepository = { findByAgentAndVersion: jest.fn() };
  const promptsService = { resolvePublishedByCode: jest.fn() };
  const toolInvoker = { invokeAll: jest.fn() } as unknown as ToolInvokerService;

  const defaultRunnerConfig = {
    mode: 'ollama',
    defaultModel: 'llama3.2',
    timeoutMs: 120_000,
    ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2' },
    openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    anthropic: {
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-20250514',
    },
    gemini: { apiKey: '', model: 'gemini-2.0-flash' },
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'agentRunner') {
        return defaultRunnerConfig;
      }
      if (key === 'toolRuntime') {
        return { mode: 'stub', storageRoot: '.data/tool-storage', resultMaxBytes: 262_144 };
      }
      return undefined;
    }),
  } as unknown as ConfigService<AllConfigType>;

  const ollamaProvider: LlmChatProvider = {
    id: 'ollama',
    chat: jest.fn(),
  };
  const openaiProvider: LlmChatProvider = {
    id: 'openai',
    chat: jest.fn(),
  };
  let providerRegistry: LlmProviderRegistry;
  let runner: LlmAgentRunnerService;

  beforeEach(() => {
    jest.clearAllMocks();
    agentVersion.configJson = {};
    agentsRepository.findByCode.mockResolvedValue(agent);
    agentVersionsRepository.findByAgentAndVersion.mockResolvedValue(agentVersion);
    promptsService.resolvePublishedByCode.mockResolvedValue({
      prompt: { code: 'fashion-trend-research-prompt' },
      version: promptVersion,
    });
    (toolInvoker.invokeAll as jest.Mock).mockResolvedValue({
      tools: [{ code: 'web-search', result: { query: 'SS27', results: [] } }],
    });
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'agentRunner') {
        return defaultRunnerConfig;
      }
      if (key === 'toolRuntime') {
        return { mode: 'stub', storageRoot: '.data/tool-storage', resultMaxBytes: 262_144 };
      }
      return undefined;
    });
    providerRegistry = new LlmProviderRegistry([ollamaProvider, openaiProvider]);
    runner = new LlmAgentRunnerService(
      configService,
      agentsRepository as never,
      agentVersionsRepository as never,
      promptsService as never,
      providerRegistry,
      toolInvoker,
    );
  });

  const baseInvoke = {
    agentCode: 'fashion-trend-research',
    agentVersion: 1,
    nodeId: 'node-1',
    input: { season: 'SS27', category: 'kids-apparel', market: 'VN' },
    attempt: 1,
  };

  it('returns parsed JSON on success via chat provider', async () => {
    const payload = {
      trendFindings: { summary: 'live', trends: [{ name: 'A' }] },
    };
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(JSON.stringify(payload));

    const result = await runner.invoke(baseInvoke);
    expect(result).toEqual({
      trendFindings: {
        summary: 'live',
        trends: [{ name: 'A', notes: '', evidence: [] }],
      },
    });
    expect(ollamaProvider.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'llama3.2',
        jsonMode: true,
        responseSchema: agentVersion.outputSchema,
        messages: expect.any(Array),
      }),
    );
  });

  it('backfills evidence from live web-search when LLM omits it', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'agentRunner') {
        return defaultRunnerConfig;
      }
      if (key === 'toolRuntime') {
        return { mode: 'live', storageRoot: '.data/tool-storage', resultMaxBytes: 262_144 };
      }
      return undefined;
    });
    (toolInvoker.invokeAll as jest.Mock).mockResolvedValue({
      tools: [
        {
          code: 'web-search',
          result: {
            results: [
              { title: 'Kids SS27', url: 'https://example.com/a', snippet: 'bright prints' },
            ],
          },
        },
      ],
    });
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(
      JSON.stringify({
        trendFindings: {
          summary: 'live',
          trends: [{ name: 'Bold prints', confidence: 0.55 }],
        },
      }),
    );

    const result = await runner.invoke(baseInvoke);
    const trends = (result.trendFindings as { trends: Array<Record<string, unknown>> }).trends;
    expect(trends[0]?.evidence).toEqual([
      { title: 'Kids SS27', url: 'https://example.com/a', quote: 'bright prints' },
    ]);
  });

  it('routes to agent config.provider and config.model', async () => {
    agentVersion.configJson = { provider: 'openai', model: 'gpt-4o' };
    (openaiProvider.chat as jest.Mock).mockResolvedValue(
      JSON.stringify({ trendFindings: { summary: 'openai', trends: [] } }),
    );

    await runner.invoke(baseInvoke);

    expect(openaiProvider.chat).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }));
    expect(ollamaProvider.chat).not.toHaveBeenCalled();
  });

  it('does not invoke tools when TOOL_RUNTIME=stub', async () => {
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(
      JSON.stringify({ trendFindings: { summary: 'x', trends: [] } }),
    );
    await runner.invoke(baseInvoke);
    expect(toolInvoker.invokeAll).not.toHaveBeenCalled();
  });

  it('enriches prompt with tool results when TOOL_RUNTIME=live', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'agentRunner') {
        return defaultRunnerConfig;
      }
      if (key === 'toolRuntime') {
        return { mode: 'live', storageRoot: '.data/tool-storage', resultMaxBytes: 262_144 };
      }
      return undefined;
    });
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(
      JSON.stringify({ trendFindings: { summary: 'enriched', trends: [] } }),
    );

    await runner.invoke(baseInvoke);

    expect(toolInvoker.invokeAll).toHaveBeenCalledWith(
      ['web-search'],
      baseInvoke.input,
      expect.objectContaining({ agentCode: 'fashion-trend-research' }),
    );
    const chatCall = (ollamaProvider.chat as jest.Mock).mock.calls[0][0];
    const contents = (chatCall.messages as Array<{ content: string }>).map((m) => m.content);
    expect(contents.some((c) => c.includes('[Tool enrichment]'))).toBe(true);
    expect(contents.some((c) => c.includes('web-search'))).toBe(true);
  });

  it('fails when required prompt vars missing', async () => {
    await expect(
      runner.invoke({
        ...baseInvoke,
        input: { season: 'SS27' },
      }),
    ).rejects.toThrow(/Missing required prompt variable/);
  });

  it('fails when prompt missing', async () => {
    promptsService.resolvePublishedByCode.mockRejectedValue(
      new Error('Prompt not found: fashion-trend-research-prompt'),
    );
    await expect(runner.invoke(baseInvoke)).rejects.toThrow(/Prompt not found/);
  });

  it('fails on non-JSON model content', async () => {
    (ollamaProvider.chat as jest.Mock).mockResolvedValue('not-json');
    await expect(runner.invoke(baseInvoke)).rejects.toThrow(/not valid JSON/);
  });

  it('fails on schema validation', async () => {
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(JSON.stringify({ wrong: true }));
    await expect(runner.invoke(baseInvoke)).rejects.toThrow(/missing required property/);
  });

  it('fails when provider throws timeout', async () => {
    (ollamaProvider.chat as jest.Mock).mockRejectedValue(
      new Error('LLM provider ollama timed out after 60000ms'),
    );
    await expect(runner.invoke(baseInvoke)).rejects.toThrow(/timed out/i);
  });

  it('fails on oversize response body', async () => {
    const huge = 'x'.repeat(1_048_576 + 10);
    (ollamaProvider.chat as jest.Mock).mockResolvedValue(huge);
    await expect(runner.invoke(baseInvoke)).rejects.toThrow(/exceeds max size/);
  });
});

describe('prompt template rendering', () => {
  it('interpolates variables', () => {
    const out = renderPromptTemplate('Hello {{name}} ({{season}})', {
      name: 'kids',
      season: 'SS27',
    });
    expect(out).toBe('Hello kids (SS27)');
  });

  it('stringifies object variables', () => {
    const out = renderPromptTemplate('Data: {{payload}}', {
      payload: { a: 1 },
    });
    expect(out).toBe('Data: {"a":1}');
  });

  it('throws when required variable missing', () => {
    expect(() =>
      renderPromptTemplate(
        '{{season}}',
        {},
        {
          type: 'object',
          required: ['season'],
        },
      ),
    ).toThrow(/Missing required prompt variable: season/);
  });

  it('throws when required variable is blank string', () => {
    expect(() =>
      renderPromptTemplate(
        '{{season}}',
        { season: '  ' },
        {
          type: 'object',
          required: ['season'],
        },
      ),
    ).toThrow(/Missing required prompt variable: season/);
  });

  it('renders messages array', () => {
    const messages = renderPromptMessages(
      [{ role: 'user', content: 'Season {{season}}' }],
      { season: 'SS27' },
      { required: ['season'] },
    );
    expect(messages).toEqual([{ role: 'user', content: 'Season SS27' }]);
  });
});
