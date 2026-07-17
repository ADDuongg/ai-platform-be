export type LlmChatMessage = {
  role: string;
  content: string;
};

export type LlmChatRequest = {
  model: string;
  messages: LlmChatMessage[];
  timeoutMs: number;
  temperature?: number;
  /** Prefer JSON object responses when the provider supports it. */
  jsonMode?: boolean;
  /**
   * Agent output JSON Schema for structured outputs.
   * Ollama: passed as `format: <schema>` (constrains shape beyond bare `json`).
   */
  responseSchema?: Record<string, unknown>;
};

/**
 * Port for vendor-specific chat APIs.
 * Add OpenAI / Gemini adapters by implementing this interface — do not fork LlmAgentRunnerService.
 */
export interface LlmChatProvider {
  readonly id: string;
  chat(request: LlmChatRequest): Promise<string>;
}
