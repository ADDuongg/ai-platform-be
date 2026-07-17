/**
 * Style Analysis Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type StyleAnalysisExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
  /** Optional Reference Image handoff */
  inspirationBoard?: Record<string, unknown>;
  groupedReferences?: Record<string, unknown>[];
  imageCandidates?: Record<string, unknown>[];
};

export type LabeledNote = {
  label: string;
  notes?: string;
};

export type AnalysisIntermediate = {
  summary: string;
  findings: LabeledNote[];
};

export type StyleReport = {
  summary: string;
  colors: LabeledNote[];
  styles: LabeledNote[];
  patterns: LabeledNote[];
  illustrationNotes: LabeledNote[];
  recommendations: LabeledNote[];
};

export const STYLE_ANALYSIS_WORKFLOW_CODE =
  'kids-fashion-style-analysis' as const;

export const STYLE_ANALYSIS_AGENT_CODES = [
  'fashion-color-analyzer',
  'fashion-style-analyzer',
  'fashion-pattern-analyzer',
  'fashion-illustration-analyzer',
] as const;

export const STYLE_ANALYSIS_PROMPT_CODES = [
  'fashion-color-analyzer-prompt',
  'fashion-style-analyzer-prompt',
  'fashion-pattern-analyzer-prompt',
  'fashion-illustration-analyzer-prompt',
] as const;
