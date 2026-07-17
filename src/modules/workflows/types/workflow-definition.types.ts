export type WorkflowNodePosition = {
  x: number;
  y: number;
};

export type WorkflowNode = {
  id: string;
  type: 'agent';
  agentCode: string;
  agentVersion?: number | null;
  label?: string | null;
  position?: WorkflowNodePosition | null;
  inputMapping?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  timeoutMs?: number | null;
  maxRetries?: number | null;
  config?: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  condition?: null;
};

export type WorkflowDefinition = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, unknown>;
  /**
   * Workflow-level policies. Platform convention (008):
   * `requiredInputs?: string[]` — top-level Execution input keys that must be
   * non-blank at start. Enforced generically by Execution start.
   */
  policies: Record<string, unknown>;
};
