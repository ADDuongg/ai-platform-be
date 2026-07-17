import type {
  StyleAnalysisExecutionInput,
  StyleReport,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface StyleAnalysisHandoff {
  workflowCode: 'kids-fashion-style-analysis';
  start(input: StyleAnalysisExecutionInput): Promise<{ executionId: string }>;
  /** After completed execution */
  readStyleReport(context: Record<string, unknown>): StyleReport | undefined;
}
