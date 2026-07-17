import type {
  DesignReviewExecutionInput,
  DesignReviewScore,
  ImprovementSuggestions,
  QualityReview,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface DesignReviewHandoff {
  workflowCode: 'kids-fashion-design-review';
  start(input: DesignReviewExecutionInput): Promise<{ executionId: string }>;
  readQualityReview(context: Record<string, unknown>): QualityReview | undefined;
  readImprovementSuggestions(
    context: Record<string, unknown>,
  ): ImprovementSuggestions | undefined;
  /** After completed execution — Milestone 2 terminal artifact */
  readDesignReviewScore(
    context: Record<string, unknown>,
  ): DesignReviewScore | undefined;
}
