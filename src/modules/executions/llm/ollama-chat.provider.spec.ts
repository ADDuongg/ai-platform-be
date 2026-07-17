import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import { OllamaChatProvider } from './ollama-chat.provider';

describe('OllamaChatProvider', () => {
  const configService = {
    get: jest.fn(() => ({
      mode: 'ollama',
      defaultModel: 'llama3.2',
      timeoutMs: 60_000,
      ollama: { baseUrl: 'http://127.0.0.1:11434', model: 'llama3.2' },
    })),
  } as unknown as ConfigService<AllConfigType>;

  const provider = new OllamaChatProvider(configService);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends Agent outputSchema as format when responseSchema is set', async () => {
    const schema = {
      type: 'object',
      required: ['inspirationBoard'],
      properties: { inspirationBoard: { type: 'object' } },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          message: { content: '{"inspirationBoard":{"summary":"ok"}}' },
        }),
    });

    const content = await provider.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hi' }],
      timeoutMs: 5_000,
      jsonMode: true,
      responseSchema: schema,
    });

    expect(content).toContain('inspirationBoard');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.format).toEqual(schema);
    expect(body.format).not.toBe('json');
  });

  it('falls back to format json when responseSchema is absent', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: { content: '{"a":1}' } }),
    });

    await provider.chat({
      model: 'llama3.2',
      messages: [{ role: 'user', content: 'hi' }],
      timeoutMs: 5_000,
      jsonMode: true,
    });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.format).toBe('json');
  });
});
