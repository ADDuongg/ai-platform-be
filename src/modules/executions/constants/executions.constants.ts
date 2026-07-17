export const EXECUTION_QUEUE = 'workflow-execution';

export const EXECUTION_JOB_RUN = 'run-execution';

export const MAX_EXECUTION_INPUT_BYTES = 256 * 1024;

export const AGENT_RUNNER = Symbol('AGENT_RUNNER');

/** Selected chat provider implementation (Ollama today; OpenAI/Gemini later). */
export const LLM_CHAT_PROVIDER = Symbol('LLM_CHAT_PROVIDER');

/**
 * Process-level runner mode.
 * - `stub` — deterministic fixtures (CI default)
 * - `ollama` | `openai` | `gemini` — live LLM via matching LlmChatProvider
 */
export const AGENT_RUNNER_MODES = ['stub', 'ollama', 'openai', 'gemini'] as const;
export type AgentRunnerMode = (typeof AGENT_RUNNER_MODES)[number];

export const LIVE_LLM_PROVIDERS = ['ollama', 'openai', 'gemini'] as const;
export type LlmProviderId = (typeof LIVE_LLM_PROVIDERS)[number];

export const DEFAULT_LLM_TIMEOUT_MS = 120_000;
export const MAX_LLM_RESPONSE_BYTES = 1_048_576;

export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.2';

export const TOOL_RUNTIME_MODES = ['stub', 'live'] as const;
export type ToolRuntimeMode = (typeof TOOL_RUNTIME_MODES)[number];

export const DEFAULT_TOOL_RESULT_MAX_BYTES = 256 * 1024;
export const DEFAULT_TOOL_STORAGE_ROOT = '.data/tool-storage';
export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;

export const MVP_TOOL_CODES = [
  'web-search',
  'web-browser',
  'image-generation',
  'object-storage',
] as const;

export type MvpToolCode = (typeof MVP_TOOL_CODES)[number];

export const TOOL_ADAPTER_REGISTRY = Symbol('TOOL_ADAPTER_REGISTRY');
