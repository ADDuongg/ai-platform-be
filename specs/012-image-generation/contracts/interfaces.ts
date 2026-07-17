import type {
  GeneratedImages,
  ImageGenPrompts,
  ImageGenerationExecutionInput,
  RawGenerations,
} from './types';

/**
 * No new HTTP routes. Clients use existing Execution + Workflow APIs.
 * @see specs/005-workflow-execution/contracts/executions-api.yaml
 */

export interface ImageGenerationHandoff {
  workflowCode: 'kids-fashion-image-generation';
  start(input: ImageGenerationExecutionInput): Promise<{ executionId: string }>;
  readImageGenPrompts(context: Record<string, unknown>): ImageGenPrompts | undefined;
  readRawGenerations(context: Record<string, unknown>): RawGenerations | undefined;
  /** After completed execution — required Design Review handoff */
  readGeneratedImages(
    context: Record<string, unknown>,
  ): GeneratedImages | undefined;
}
