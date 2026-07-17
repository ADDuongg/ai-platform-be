/**
 * Client/FE types for LLM Agent Runner.
 * Aligned with llm-agent-runner-api.yaml — no Nest/TypeORM imports.
 */

export type AgentRunnerMode = 'stub' | 'ollama' | 'openai' | 'gemini';

export type LlmProviderId = 'ollama' | 'openai' | 'gemini';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecuteWorkflowRequest {
  input: Record<string, unknown>;
}

export interface ExecutionSummary {
  id: string;
  status: ExecutionStatus;
  workflowCode?: string;
}

export interface ExecutionDetail extends ExecutionSummary {
  context?: Record<string, unknown>;
  error?: Record<string, unknown> | null;
}

export interface ExecutionStep {
  nodeId: string;
  agentCode?: string;
  status: string;
  error?: Record<string, unknown> | null;
}

/** Operator env — not a REST body; documented for FE/ops tooling. */
export interface LlmAgentRunnerEnvConfig {
  AGENT_RUNNER: AgentRunnerMode;
  LLM_TIMEOUT_MS?: number;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  OLLAMA_TIMEOUT_MS?: number;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export const LLM_AGENT_RUNNER_CONSTRAINTS = {
  defaultTimeoutMs: 120_000,
  maxResponseBytes: 1_048_576,
  logFullPromptAndResponse: true,
  implementedProviders: ['ollama'] as const,
  reservedProviders: ['openai', 'gemini'] as const,
} as const;

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
}
