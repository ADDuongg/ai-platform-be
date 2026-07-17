import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

/**
 * Placeholder for future Google Gemini adapter.
 * Register a real implementation here — LlmAgentRunnerService / orchestrator stay unchanged.
 *
 * Env (reserved): GEMINI_API_KEY, GEMINI_MODEL
 * Switch with: AGENT_RUNNER=gemini
 */
export class GeminiChatProvider implements LlmChatProvider {
  readonly id = 'gemini';

  async chat(_request: LlmChatRequest): Promise<string> {
    throw new Error(
      'LLM provider gemini is not implemented yet. Set AGENT_RUNNER=ollama or stub, or implement GeminiChatProvider.chat().',
    );
  }
}
