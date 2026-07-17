import type {
  InspirationBoard,
  ReferenceImageExecutionInput,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface ReferenceImageHandoff {
  workflowCode: 'kids-fashion-reference-image';
  start(input: ReferenceImageExecutionInput): Promise<{ executionId: string }>;
  /** After completed execution */
  readInspirationBoard(context: Record<string, unknown>): InspirationBoard | undefined;
}
