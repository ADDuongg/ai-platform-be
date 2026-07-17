import type {
  ExecuteWorkflowRequest,
  ExecutionDetail,
  ExecutionStep,
  ExecutionSummary,
  LlmAgentRunnerEnvConfig,
} from './types';

/**
 * FE-facing client surface. No new methods vs existing Execution APIs —
 * included so consumers know this feature does not add routes.
 */
export interface LlmAgentRunnerAwareExecutionClient {
  executeWorkflow(
    workflowId: string,
    body: ExecuteWorkflowRequest,
  ): Promise<ExecutionSummary>;

  getExecution(executionId: string): Promise<ExecutionDetail>;

  listExecutionSteps(executionId: string): Promise<ExecutionStep[]>;
}

/**
 * Optional helper for ops/docs UIs that display recommended env.
 * Not fetched from the API in MVP.
 */
export interface LlmAgentRunnerConfigView {
  recommendedEnv: LlmAgentRunnerEnvConfig;
  notes: string[];
}
