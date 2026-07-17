import type {
  ResearchReport,
  TrendResearchExecutionInput,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface TrendResearchHandoff {
  workflowCode: 'kids-fashion-trend-research';
  start(input: TrendResearchExecutionInput): Promise<{ executionId: string }>;
  /** After completed execution */
  readReport(context: Record<string, unknown>): ResearchReport | undefined;
}
