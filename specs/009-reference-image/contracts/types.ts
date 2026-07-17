/**
 * Reference Image Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type ReferenceImageExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
  /** Optional Trend Research handoff */
  researchReport?: Record<string, unknown>;
  references?: ReferenceItem[];
  trendFindings?: Record<string, unknown>;
};

export type ReferenceItem = {
  title: string;
  url?: string;
  thumbnailUrl?: string;
  notes?: string;
};

export type ImageCandidate = ReferenceItem;

export type GroupedReferences = {
  group: string;
  items: ReferenceItem[];
};

export type InspirationBoard = {
  summary: string;
  groups: GroupedReferences[];
  references: ReferenceItem[];
  notes: string[];
};

export const REFERENCE_IMAGE_WORKFLOW_CODE = 'kids-fashion-reference-image' as const;

export const REFERENCE_IMAGE_AGENT_CODES = [
  'fashion-image-search',
  'fashion-reference-grouper',
  'fashion-inspiration-organizer',
] as const;

export const REFERENCE_IMAGE_PROMPT_CODES = [
  'fashion-image-search-prompt',
  'fashion-reference-grouper-prompt',
  'fashion-inspiration-organizer-prompt',
] as const;
