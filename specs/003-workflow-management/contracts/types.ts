export type WorkflowStatus = 'draft' | 'published' | 'archived';
export type WorkflowVersionStatus = 'draft' | 'published';

export interface WorkflowDefinition {
  nodes: unknown[];
  edges: unknown[];
  variables: Record<string, unknown>;
  policies: Record<string, unknown>;
}

export interface WorkflowDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  status: WorkflowStatus;
  currentVersion: number | null;
  draftVersion?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowVersionDto {
  id: string;
  workflowId: string;
  version: number;
  status: WorkflowVersionStatus;
  definition: WorkflowDefinition;
  changelog: string | null;
  publishedAt: string | null;
  createdAt: string;
}
