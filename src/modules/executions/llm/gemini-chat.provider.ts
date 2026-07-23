import { Injectable } from '@nestjs/common';

import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

/**
 * Placeholder for future Google Gemini adapter.
 * Env (reserved): GEMINI_API_KEY, GEMINI_MODEL
 */
@Injectable()
export class GeminiChatProvider implements LlmChatProvider {
  readonly id = 'gemini';

  async chat(_request: LlmChatRequest): Promise<string> {
    throw new Error(
      'LLM provider gemini is not implemented yet. Set AGENT_RUNNER=ollama|openai|anthropic or stub, or implement GeminiChatProvider.chat().',
    );
  }
}
