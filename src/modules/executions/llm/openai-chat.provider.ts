import type { LlmChatProvider, LlmChatRequest } from './llm-chat.provider';

/**
 * Placeholder for future OpenAI Chat Completions adapter.
 * Register a real implementation here — LlmAgentRunnerService / orchestrator stay unchanged.
 *
 * Env (reserved): OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
 * Switch with: AGENT_RUNNER=openai
 */
export class OpenAiChatProvider implements LlmChatProvider {
  readonly id = 'openai';

  async chat(_request: LlmChatRequest): Promise<string> {
    throw new Error(
      'LLM provider openai is not implemented yet. Set AGENT_RUNNER=ollama or stub, or implement OpenAiChatProvider.chat().',
    );
  }
}
