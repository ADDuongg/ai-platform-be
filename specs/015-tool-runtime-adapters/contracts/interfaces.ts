import type {
  ExecuteWorkflowRequest,
  ExecutionDetail,
  ExecutionStep,
  ExecutionSummary,
  ToolRuntimeEnvConfig,
} from './types';

/**
 * FE-facing client surface. No new methods vs existing Execution APIs —
 * tool runtime is internal to the live Agent runner.
 */
export interface ToolRuntimeAwareExecutionClient {
  executeWorkflow(
    workflowId: string,
    body: ExecuteWorkflowRequest,
  ): Promise<ExecutionSummary>;

  getExecution(executionId: string): Promise<ExecutionDetail>;

  listExecutionSteps(executionId: string): Promise<ExecutionStep[]>;
}

/**
 * Ops/docs helper — not fetched from the API in MVP.
 */
export interface ToolRuntimeConfigView {
  recommendedEnv: ToolRuntimeEnvConfig;
  mvpProviders: {
    'web-search': 'duckduckgo';
    'web-browser': 'native-fetch';
    'image-generation': 'stub-live';
    'object-storage': 'filesystem';
  };
  futureProvidersCommentedOnly: {
    'web-search': 'google-cse';
    'web-browser': 'browserless';
    'image-generation': 'flux';
    'object-storage': 'aws-s3';
  };
  notes: string[];
}
