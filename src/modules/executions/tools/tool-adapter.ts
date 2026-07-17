import type { ToolVersionEntity } from '@modules/tools/entities/tool-version.entity';

export type ToolAdapterInvokeInput = {
  code: string;
  input: Record<string, unknown>;
  configJson: Record<string, unknown>;
  timeoutMs: number;
  maxBytes: number;
  storageRoot: string;
  /** Optional abort signal for HTTP adapters */
  signal?: AbortSignal;
};

export interface ToolAdapter {
  /** Tool catalog code this adapter handles */
  readonly code: string;
  invoke(params: ToolAdapterInvokeInput): Promise<Record<string, unknown>>;
}

export type ToolEnrichmentItem = {
  code: string;
  result: Record<string, unknown>;
};

export type ToolEnrichmentBundle = {
  tools: ToolEnrichmentItem[];
};

export type ResolvedToolVersion = {
  code: string;
  version: ToolVersionEntity;
};
