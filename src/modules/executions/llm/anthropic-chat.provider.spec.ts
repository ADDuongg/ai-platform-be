import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import { AnthropicChatProvider } from './anthropic-chat.provider';

describe('AnthropicChatProvider', () => {
  const configService = {
    get: jest.fn(() => ({
      mode: 'anthropic',
      defaultModel: 'claude-sonnet-4-20250514',
      timeoutMs: 60_000,
      anthropic: {
        apiKey: 'ant-key',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
    })),
  } as unknown as ConfigService<AllConfigType>;

  const provider = new AnthropicChatProvider(configService);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('throws when API key missing', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce({
      anthropic: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
    });
    await expect(
      provider.chat({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'hi' }],
        timeoutMs: 5_000,
      }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it('calls messages API and returns text content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          content: [{ type: 'text', text: '{"ok":true}' }],
        }),
    });

    const content = await provider.chat({
      model: 'claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: 'Be brief' },
        { role: 'user', content: 'hi' },
      ],
      timeoutMs: 5_000,
    });

    expect(content).toBe('{"ok":true}');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'ant-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('claude-sonnet-4-20250514');
    expect(body.system).toBe('Be brief');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });
});
