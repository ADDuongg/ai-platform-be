/**
 * Trend Research Workflow — contract types (FE / clients).
 * No new REST resources; conventions on existing Workflow definition + Execution.
 */

export type RequiredInputsPolicy = {
  /** Top-level Execution input keys that must be present and non-blank */
  requiredInputs?: string[];
};

export type TrendResearchExecutionInput = {
  season: string;
  category: string;
  market: string;
  ageBand?: string;
  constraints?: string;
};

export type ReferenceItem = {
  title: string;
  url?: string;
  notes?: string;
};

export type TrendFindings = {
  summary: string;
  trends: Array<Record<string, unknown>>;
};

export type ResearchReport = {
  summary: string;
  trends: Array<Record<string, unknown>>;
  references: ReferenceItem[];
  gaps: string[];
};

export const TREND_RESEARCH_WORKFLOW_CODE = 'kids-fashion-trend-research' as const;

export const FASHION_AGENT_CODES = [
  'fashion-trend-research',
  'fashion-reference-collector',
  'fashion-research-report',
] as const;

export const FASHION_PROMPT_CODES = [
  'fashion-trend-research-prompt',
  'fashion-reference-collector-prompt',
  'fashion-research-report-prompt',
] as const;
