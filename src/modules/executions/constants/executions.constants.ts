export const EXECUTION_QUEUE = 'workflow-execution';

export const EXECUTION_JOB_RUN = 'run-execution';

export const MAX_EXECUTION_INPUT_BYTES = 256 * 1024;

export const AGENT_RUNNER = Symbol('AGENT_RUNNER');

/** @deprecated Prefer LLM_PROVIDER_REGISTRY for per-agent routing. */
export const LLM_CHAT_PROVIDER = Symbol('LLM_CHAT_PROVIDER');

/** Registry of live chat providers keyed by provider id. */
export const LLM_PROVIDER_REGISTRY = Symbol('LLM_PROVIDER_REGISTRY');

/**
 * Process-level runner mode.
 * - `stub` — deterministic fixtures (CI default)
 * - `ollama` | `openai` | `anthropic` | `gemini` — live LLM (default provider; agents may override)
 */
export const AGENT_RUNNER_MODES = ['stub', 'ollama', 'openai', 'anthropic', 'gemini'] as const;
export type AgentRunnerMode = (typeof AGENT_RUNNER_MODES)[number];

export const LIVE_LLM_PROVIDERS = ['ollama', 'openai', 'anthropic', 'gemini'] as const;
export type LlmProviderId = (typeof LIVE_LLM_PROVIDERS)[number];

export const DEFAULT_LLM_TIMEOUT_MS = 120_000;
export const MAX_LLM_RESPONSE_BYTES = 1_048_576;

export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.2';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';
export const DEFAULT_ANTHROPIC_MAX_TOKENS = 4096;

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
