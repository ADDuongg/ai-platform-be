/**
 * Image Generation Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type ImageGenerationExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
  /** Required Design Brief handoff */
  designBrief: Record<string, unknown>;
  designSpecification: Record<string, unknown>;
};

export type ImageGenPromptItem = {
  id: string;
  label: string;
  text: string;
};

export type ImageGenPrompts = {
  summary: string;
  prompts: ImageGenPromptItem[];
};

export type GenerationVariation = {
  id: string;
  label: string;
  promptRef?: string;
  assetUrl?: string;
  notes?: string;
};

/** Intermediate drafts from generate step */
export type RawGenerations = GenerationVariation[];

export type GeneratedImages = {
  summary: string;
  variations: GenerationVariation[];
};

/** Required Design Review handoff artifact. */
export type ImageGenerationHandoffContext = {
  generatedImages: GeneratedImages;
};

export const IMAGE_GENERATION_WORKFLOW_CODE =
  'kids-fashion-image-generation' as const;

export const IMAGE_GENERATION_AGENT_CODES = [
  'fashion-image-prompt-prep',
  'fashion-image-generator',
  'fashion-image-organizer',
] as const;

export const IMAGE_GENERATION_PROMPT_CODES = [
  'fashion-image-prompt-prep-prompt',
  'fashion-image-generator-prompt',
  'fashion-image-organizer-prompt',
] as const;

export const IMAGE_GENERATION_TOOL_CODES = {
  generation: 'image-generation',
  organize: 'object-storage',
} as const;
