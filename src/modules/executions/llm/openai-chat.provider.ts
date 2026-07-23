import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import {
  DEFAULT_OPENAI_BASE_URL,
  MAX_LLM_RESPONSE_BYTES,
} from '../constants/executions.constants';
import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

type OpenAiChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

@Injectable()
export class OpenAiChatProvider implements LlmChatProvider {
  readonly id = 'openai';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async chat(request: LlmChatRequest): Promise<string> {
    const runner = this.configService.get('agentRunner', { infer: true });
    const apiKey = runner?.openai?.apiKey?.trim() ?? '';
    if (!apiKey) {
      throw new Error(
        'LLM provider openai requires OPENAI_API_KEY. Set the env var or use another provider.',
      );
    }

    const baseUrl = (runner?.openai?.baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
    };
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.jsonMode !== false) {
      body.response_format = { type: 'json_object' };
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTimeoutError(error)) {
        throw new Error(`LLM provider openai timed out after ${request.timeoutMs}ms: ${message}`);
      }
      throw new Error(`LLM provider openai unreachable or request failed: ${message}`);
    }

    const rawText = await response.text();
    const bytes = Buffer.byteLength(rawText, 'utf8');
    if (bytes > MAX_LLM_RESPONSE_BYTES) {
      throw new Error(
        `LLM provider openai response exceeds max size (${bytes} bytes > ${MAX_LLM_RESPONSE_BYTES} bytes)`,
      );
    }

    if (!response.ok) {
      throw new Error(`LLM provider openai HTTP ${response.status}: ${rawText.slice(0, 500)}`);
    }

    let payload: OpenAiChatCompletionResponse;
    try {
      payload = JSON.parse(rawText) as OpenAiChatCompletionResponse;
    } catch {
      throw new Error('LLM provider openai returned non-JSON HTTP body');
    }

    if (payload.error?.message) {
      throw new Error(`LLM provider openai error: ${payload.error.message}`);
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LLM provider openai response missing choices[0].message.content');
    }
    return content;
  }
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
