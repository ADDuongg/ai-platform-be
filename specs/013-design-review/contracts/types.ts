/**
 * Design Review Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type GenerationVariation = {
  id: string;
  label: string;
  promptRef?: string;
  assetUrl?: string;
  notes?: string;
};

export type GeneratedImages = {
  summary: string;
  variations: GenerationVariation[];
};

export type DesignReviewExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
  designBrief?: Record<string, unknown>;
  designSpecification?: Record<string, unknown>;
  /** Required Image Generation handoff */
  generatedImages: GeneratedImages;
};

export type QualityFinding = {
  id: string;
  label: string;
  /** Optional free-text; no enum */
  severity?: string;
  variationRef?: string;
  notes?: string;
};

export type QualityReview = {
  summary: string;
  findings: QualityFinding[];
};

export type ImprovementSuggestion = {
  id: string;
  label: string;
  priority?: string;
  variationRef?: string;
  notes?: string;
};

export type ImprovementSuggestions = {
  summary: string;
  suggestions: ImprovementSuggestion[];
};

export type PerVariationScore = {
  variationRef: string;
  score: number;
  notes?: string;
};

export type ScoreCriterion = {
  id: string;
  label: string;
  score?: number;
  notes?: string;
};

export type DesignReviewScore = {
  summary: string;
  overallScore: number;
  /** Required in default stub fixtures (exactly 2); optional otherwise */
  perVariation?: PerVariationScore[];
  criteria?: ScoreCriterion[];
  notes?: string[];
};

/** Milestone 2 terminal Shared Context keys. */
export type DesignReviewCompletedContext = {
  qualityReview: QualityReview;
  improvementSuggestions: ImprovementSuggestions;
  designReviewScore: DesignReviewScore;
};

export const DESIGN_REVIEW_WORKFLOW_CODE =
  'kids-fashion-design-review' as const;

export const DESIGN_REVIEW_AGENT_CODES = [
  'fashion-quality-reviewer',
  'fashion-improvement-suggester',
  'fashion-design-scorer',
] as const;

export const DESIGN_REVIEW_PROMPT_CODES = [
  'fashion-quality-reviewer-prompt',
  'fashion-improvement-suggester-prompt',
  'fashion-design-scorer-prompt',
] as const;

export const DESIGN_REVIEW_TOOL_CODES = {
  score: 'object-storage',
} as const;
