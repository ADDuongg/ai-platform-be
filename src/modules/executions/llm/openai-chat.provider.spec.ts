import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import { OpenAiChatProvider } from './openai-chat.provider';

describe('OpenAiChatProvider', () => {
  const configService = {
    get: jest.fn(() => ({
      mode: 'openai',
      defaultModel: 'gpt-4o-mini',
      timeoutMs: 60_000,
      openai: {
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
    })),
  } as unknown as ConfigService<AllConfigType>;

  const provider = new OpenAiChatProvider(configService);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('throws when API key missing', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce({
      openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    });
    await expect(
      provider.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
        timeoutMs: 5_000,
      }),
    ).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('calls chat completions and returns content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
    });

    const content = await provider.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
      timeoutMs: 5_000,
      jsonMode: true,
      temperature: 0.1,
    });

    expect(content).toBe('{"ok":true}');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});
