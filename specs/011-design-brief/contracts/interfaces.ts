import type {
  DesignBrief,
  DesignBriefExecutionInput,
  DesignSpecification,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface DesignBriefHandoff {
  workflowCode: 'kids-fashion-design-brief';
  start(input: DesignBriefExecutionInput): Promise<{ executionId: string }>;
  /** After completed execution — both artifacts required for Image Generation */
  readDesignBrief(context: Record<string, unknown>): DesignBrief | undefined;
  readDesignSpecification(
    context: Record<string, unknown>,
  ): DesignSpecification | undefined;
}
