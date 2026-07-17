/**
 * Design Brief Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type DesignBriefExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
  /** Optional Style Analysis handoff */
  styleReport?: Record<string, unknown>;
  colorAnalysis?: Record<string, unknown>;
  styleAnalysis?: Record<string, unknown>;
  patternAnalysis?: Record<string, unknown>;
};

export type LabeledNote = {
  label: string;
  notes?: string;
};

export type DesignBrief = {
  summary: string;
  themes: LabeledNote[];
  mustHaves: LabeledNote[];
  avoid: LabeledNote[];
};

export type DesignSpecification = {
  summary: string;
  objectives: LabeledNote[];
  constraints: LabeledNote[];
  colorDirection: LabeledNote[];
  styleDirection: LabeledNote[];
  patternDirection: LabeledNote[];
  deliverables: LabeledNote[];
};

/** Both keys are required Image Generation handoff artifacts. */
export type DesignBriefHandoffContext = {
  designBrief: DesignBrief;
  designSpecification: DesignSpecification;
};

export const DESIGN_BRIEF_WORKFLOW_CODE =
  'kids-fashion-design-brief' as const;

export const DESIGN_BRIEF_AGENT_CODES = [
  'fashion-design-brief-writer',
  'fashion-design-spec-writer',
] as const;

export const DESIGN_BRIEF_PROMPT_CODES = [
  'fashion-design-brief-writer-prompt',
  'fashion-design-spec-writer-prompt',
] as const;
