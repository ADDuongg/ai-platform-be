import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import {
  DEFAULT_ANTHROPIC_BASE_URL,
  DEFAULT_ANTHROPIC_MAX_TOKENS,
  DEFAULT_ANTHROPIC_VERSION,
  MAX_LLM_RESPONSE_BYTES,
} from '../constants/executions.constants';
import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
};

@Injectable()
export class AnthropicChatProvider implements LlmChatProvider {
  readonly id = 'anthropic';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async chat(request: LlmChatRequest): Promise<string> {
    const runner = this.configService.get('agentRunner', { infer: true });
    const apiKey = runner?.anthropic?.apiKey?.trim() ?? '';
    if (!apiKey) {
      throw new Error(
        'LLM provider anthropic requires ANTHROPIC_API_KEY. Set the env var or use another provider.',
      );
    }

    const baseUrl = (runner?.anthropic?.baseUrl ?? DEFAULT_ANTHROPIC_BASE_URL).replace(/\/$/, '');
    const url = `${baseUrl}/v1/messages`;
    const { system, messages } = splitSystemMessages(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: DEFAULT_ANTHROPIC_MAX_TOKENS,
      messages,
    };
    if (system) {
      body.system = system;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': DEFAULT_ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTimeoutError(error)) {
        throw new Error(
          `LLM provider anthropic timed out after ${request.timeoutMs}ms: ${message}`,
        );
      }
      throw new Error(`LLM provider anthropic unreachable or request failed: ${message}`);
    }

    const rawText = await response.text();
    const bytes = Buffer.byteLength(rawText, 'utf8');
    if (bytes > MAX_LLM_RESPONSE_BYTES) {
      throw new Error(
        `LLM provider anthropic response exceeds max size (${bytes} bytes > ${MAX_LLM_RESPONSE_BYTES} bytes)`,
      );
    }

    if (!response.ok) {
      throw new Error(`LLM provider anthropic HTTP ${response.status}: ${rawText.slice(0, 500)}`);
    }

    let payload: AnthropicMessageResponse;
    try {
      payload = JSON.parse(rawText) as AnthropicMessageResponse;
    } catch {
      throw new Error('LLM provider anthropic returned non-JSON HTTP body');
    }

    if (payload.error?.message) {
      throw new Error(`LLM provider anthropic error: ${payload.error.message}`);
    }

    const textBlock = payload.content?.find((block) => block.type === 'text' || block.text);
    const content = textBlock?.text;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LLM provider anthropic response missing content[0].text');
    }
    return content;
  }
}

function splitSystemMessages(messages: LlmChatRequest['messages']): {
  system?: string;
  messages: Array<{ role: string; content: string }>;
} {
  const systemParts: string[] = [];
  const rest: Array<{ role: string; content: string }> = [];
  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
      continue;
    }
    rest.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    });
  }
  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    messages: rest,
  };
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return true;
  }
  return false;
}
