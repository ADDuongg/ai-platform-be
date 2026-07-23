import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AllConfigType } from '@common/config';

import { DEFAULT_OLLAMA_BASE_URL, MAX_LLM_RESPONSE_BYTES } from '../constants/executions.constants';
import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

type OllamaChatResponse = {
  message?: { content?: string };
  response?: string;
  error?: string;
};

@Injectable()
export class OllamaChatProvider implements LlmChatProvider {
  readonly id = 'ollama';

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async chat(request: LlmChatRequest): Promise<string> {
    const agentRunnerConfig = this.configService.get('agentRunner', { infer: true });
    const baseUrl = (agentRunnerConfig?.ollama?.baseUrl ?? DEFAULT_OLLAMA_BASE_URL).replace(
      /\/$/,
      '',
    );
    const url = `${baseUrl}/api/chat`;
    const body = buildOllamaRequestBody(request);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(request.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTimeoutError(error)) {
        throw new Error(`LLM provider ollama timed out after ${request.timeoutMs}ms: ${message}`);
      }
      throw new Error(`LLM provider ollama unreachable or request failed: ${message}`);
    }

    const rawText = await response.text();
    const bytes = Buffer.byteLength(rawText, 'utf8');
    if (bytes > MAX_LLM_RESPONSE_BYTES) {
      throw new Error(
        `LLM provider ollama response exceeds max size (${bytes} bytes > ${MAX_LLM_RESPONSE_BYTES} bytes)`,
      );
    }

    if (!response.ok) {
      throw new Error(`LLM provider ollama HTTP ${response.status}: ${rawText.slice(0, 500)}`);
    }

    let payload: OllamaChatResponse;
    try {
      payload = JSON.parse(rawText) as OllamaChatResponse;
    } catch {
      throw new Error('LLM provider ollama returned non-JSON HTTP body');
    }

    if (payload.error) {
      throw new Error(`LLM provider ollama error: ${payload.error}`);
    }

    const content = payload.message?.content ?? payload.response;
    if (typeof content !== 'string') {
      throw new Error('LLM provider ollama response missing message.content');
    }
    return content;
  }
}

function buildOllamaRequestBody(request: LlmChatRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages,
    stream: false,
  };
  // Structured output: prefer Agent outputSchema over bare format:"json"
  if (request.responseSchema && Object.keys(request.responseSchema).length > 0) {
    body.format = request.responseSchema;
  } else if (request.jsonMode !== false) {
    body.format = 'json';
  }
  if (request.temperature !== undefined) {
    body.options = { temperature: request.temperature };
  }
  return body;
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return true;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('TimeoutError') || message.includes('aborted') || message.includes('timeout')
  );
}
